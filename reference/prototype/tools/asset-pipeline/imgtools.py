"""Asset-pipeline helpers: LaMa inpainting, Real-ESRGAN x4 upscaling, BiRefNet matting.

All models run on CPU through onnxruntime. Model files live in /home/claude/models
(LaMa: Carve/LaMa-ONNX, Real-ESRGAN: RealESRGAN_x4plus ONNX export, BiRefNet via rembg).
"""
import numpy as np
from PIL import Image, ImageFilter
import onnxruntime as ort

MODELS = '/home/claude/models'
_sessions = {}


def _sess(name):
    if name not in _sessions:
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 2
        _sessions[name] = ort.InferenceSession(f'{MODELS}/{name}', opts, providers=['CPUExecutionProvider'])
    return _sessions[name]


def load(path, mode='RGB'):
    return np.asarray(Image.open(path).convert(mode))


def save(arr, path, **kw):
    Image.fromarray(arr).save(path, **kw)


# ---------------------------------------------------------------- LaMa inpainting
def lama_window(img, mask, box):
    """Inpaint the masked pixels inside `box` (x0,y0,x1,y1) using LaMa at 512x512.
    img: HxWx3 uint8, mask: HxW bool (True = remove). Returns a new image."""
    x0, y0, x1, y1 = box
    win = img[y0:y1, x0:x1]
    m = mask[y0:y1, x0:x1]
    h, w = win.shape[:2]
    wi = np.asarray(Image.fromarray(win).resize((512, 512), Image.LANCZOS)).astype(np.float32) / 255.0
    mi = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((512, 512), Image.BILINEAR)) > 20
    out = _sess('lama_fp32.onnx').run(None, {
        'image': wi.transpose(2, 0, 1)[None],
        'mask': mi.astype(np.float32)[None, None],
    })[0][0].transpose(1, 2, 0)
    if out.max() <= 1.5:
        out = out * 255.0
    out = np.clip(out, 0, 255).astype(np.uint8)
    out = np.asarray(Image.fromarray(out).resize((w, h), Image.LANCZOS)).astype(np.float32)
    # feathered paste: only masked area (slightly grown) is replaced
    soft = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2))
    a = (np.asarray(soft).astype(np.float32) / 255.0)[..., None]
    res = img.copy()
    res[y0:y1, x0:x1] = np.clip(win * (1 - a) + out * a, 0, 255).astype(np.uint8)
    return res


def grow(mask, px):
    im = Image.fromarray((mask * 255).astype(np.uint8))
    for _ in range(max(1, px // 2)):
        im = im.filter(ImageFilter.MaxFilter(5 if px >= 2 else 3))
    return np.asarray(im) > 127


# ---------------------------------------------------------------- Real-ESRGAN x4
def esrgan_x4(img, tile=160, pad=12):
    """Upscale HxWx3 uint8 by 4x with Real-ESRGAN (tiled)."""
    s = _sess('RealESRGAN_x4.onnx')
    h, w = img.shape[:2]
    out = np.zeros((h * 4, w * 4, 3), np.float32)
    src = img.astype(np.float32) / 255.0
    for ty in range(0, h, tile):
        for tx in range(0, w, tile):
            ax0, ay0 = max(tx - pad, 0), max(ty - pad, 0)
            ax1, ay1 = min(tx + tile + pad, w), min(ty + tile + pad, h)
            t = src[ay0:ay1, ax0:ax1].transpose(2, 0, 1)[None]
            r = s.run(None, {'input': t})[0][0].transpose(1, 2, 0)
            cx0, cy0 = (tx - ax0) * 4, (ty - ay0) * 4
            cw, ch = (min(tx + tile, w) - tx) * 4, (min(ty + tile, h) - ty) * 4
            out[ty * 4:ty * 4 + ch, tx * 4:tx * 4 + cw] = r[cy0:cy0 + ch, cx0:cx0 + cw]
    return np.clip(out * 255.0, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- BiRefNet matting
def matte(img, model='birefnet-portrait'):
    """Return alpha (HxW float 0..1) for the main subject."""
    from rembg import new_session, remove
    key = 'rembg:' + model
    if key not in _sessions:
        _sessions[key] = new_session(model)
    rgba = remove(Image.fromarray(img), session=_sessions[key], only_mask=True)
    return np.asarray(rgba.convert('L')).astype(np.float32) / 255.0


def decontaminate(img, alpha):
    """Estimate clean foreground colours at soft edges (removes background halo)."""
    from pymatting import estimate_foreground_ml
    fg = estimate_foreground_ml(img.astype(np.float64) / 255.0, alpha.astype(np.float64))
    return np.clip(fg * 255.0, 0, 255).astype(np.uint8)
