import sys; sys.path.insert(0,'/home/claude/tools')
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from imgtools import load, save, grow
SCR='/home/claude/kit_raw/Virtual_TryOn_App_Asset_Kit_V1/01_screens/'
img=load(SCR+'03_fitting_room.png'); H,W=img.shape[:2]
base=np.asarray(Image.open('/home/claude/assets_work/renders/avatar_base.png'))
alpha=np.zeros((H,W),np.float32); alpha[150:1822,120:760]=base[...,3]/255.0
mask=grow(alpha>0.02,16)
mi=Image.new('L',(W,H),0); d=ImageDraw.Draw(mi)
for r in [(0,15,W,75),(25,95,95,170),(290,95,575,175),(735,80,840,185),(640,170,860,245),(5,240,215,1010),(690,250,845,1770)]:
    d.rectangle(r,fill=255)
d.ellipse((230,1680,700,1805),fill=255)  # contact shadows
mask|=np.asarray(mi)>0
known=(~mask).astype(np.float64); src=img.astype(np.float64)
acc=np.zeros_like(src); filled=np.zeros((H,W),bool)
for sigma in [8,16,32,64,128,220]:
    num=np.stack([ndimage.gaussian_filter(src[...,c]*known,sigma) for c in range(3)],-1)
    den=ndimage.gaussian_filter(known,sigma)[...,None]
    est=num/np.maximum(den,1e-6)
    ok=(den[...,0]>0.3)&~filled&mask
    acc[ok]=est[ok]; filled|=ok
rest=mask&~filled; acc[rest]=est[rest]
plate=np.where(mask[...,None],acc,src)
# blend the filled area smoothly with the original (feather 10px)
fm=ndimage.gaussian_filter(mask.astype(float),6)[...,None]
plate=src*(1-fm)+plate*fm
plate=np.stack([ndimage.gaussian_filter(plate[...,c],2.5) for c in range(3)],-1)
plate+=np.random.default_rng(3).normal(0,0.7,plate.shape)
plate=np.clip(plate,0,255).astype(np.uint8)
save(plate,'/home/claude/assets_work/fitting_plate.png')
# composite preview of each render
for name in ['base','look1','look2','look3']:
    r=Image.open(f'/home/claude/assets_work/renders/avatar_{name}.png')
    comp=Image.fromarray(plate).convert('RGBA'); comp.alpha_composite(r,(120,150))
    comp.convert('RGB').resize((432,911)).save(f'/home/claude/scratch/comp_{name}.png')
print('ok')
