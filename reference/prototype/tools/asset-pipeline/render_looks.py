"""Fitting-room renders: base avatar + 3 looks as RGBA on a shared canvas (screen coords)."""
import sys, os, json
sys.path.insert(0,'/home/claude/tools')
import numpy as np
from PIL import Image
from imgtools import load, save, matte, decontaminate

OUT='/home/claude/assets_work/renders/'; os.makedirs(OUT,exist_ok=True)
SCR='/home/claude/kit_raw/Virtual_TryOn_App_Asset_Kit_V1/01_screens/'

def matte_tall(img, model='isnet-general-use'):
    """Run matting on overlapping vertical halves for better resolution on tall images."""
    h,w=img.shape[:2]
    if h <= int(w*1.3):
        return matte(img, model)
    seg=int(min(h, w*1.25)); ov=int(seg*0.25)
    starts=list(range(0, max(h-seg,0)+1, seg-ov))
    if starts[-1]+seg<h: starts.append(h-seg)
    acc=np.zeros((h,w),np.float32); wt=np.zeros((h,w),np.float32)
    for s in starts:
        a=matte(img[s:s+seg], model)
        ramp=np.ones(seg,np.float32)
        r=min(ov,seg//2)
        if s>0: ramp[:r]=np.linspace(0,1,r)
        if s+seg<h: ramp[-r:]=np.linspace(1,0,r)
        acc[s:s+seg]+=a*ramp[:,None]; wt[s:s+seg]+=ramp[:,None]
    return acc/np.maximum(wt,1e-6)

def figure_box(alpha):
    ys,xs=np.where(alpha>0.5)
    top,bot=ys.min(),ys.max()
    head=alpha[top:top+int((bot-top)*0.08)]
    hy,hx=np.where(head>0.5)
    return top,bot,hx.mean()

# canvas in fitting-room screen coordinates (863-wide reference)
CX0,CY0,CX1,CY1=120,150,760,1822
CW,CH=CX1-CX0,CY1-CY0
meta={}
# --- base
scr=load(SCR+'03_fitting_room.png')
crop=scr[CY0:CY1,CX0:CX1]
a=matte_tall(crop)
fg=decontaminate(crop,a)
save(np.dstack([fg,(a*255).astype(np.uint8)]),OUT+'avatar_base.png')
top,bot,hx=figure_box(a)
meta['base']={'top':int(top),'bottom':int(bot),'headX':float(hx)}
print('base',meta['base'],flush=True)
H0=bot-top
for i in (1,2,3):
    up=load(f'/home/claude/assets_work/stylist/look{i}_x4.png')
    al=matte_tall(up)
    fgl=decontaminate(up,al)
    t,b,hxl=figure_box(al)
    s=H0/(b-t)
    nw,nh=int(round(up.shape[1]*s)),int(round(up.shape[0]*s))
    rgba=np.dstack([fgl,(al*255).astype(np.uint8)])
    im=Image.fromarray(rgba).resize((nw,nh),Image.LANCZOS)
    # place so that head-top and head-x match base
    ox=int(round(hx - hxl*s)); oy=int(round(top - t*s))
    canvas=Image.new('RGBA',(CW,CH),(0,0,0,0))
    canvas.alpha_composite(im,(max(ox,0),max(oy,0)),(max(-ox,0),max(-oy,0)))
    canvas.save(OUT+f'avatar_look{i}.png')
    meta[f'look{i}']={'scale':s,'ox':ox,'oy':oy}
    print('look',i,meta[f'look{i}'],flush=True)
json.dump(meta,open(OUT+'meta.json','w'),indent=1)
print('done')
