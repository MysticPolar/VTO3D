"""Clean background plate for the showcase board: remove headline, phones and captions (LaMa @ half res)."""
import sys; sys.path.insert(0,'/home/claude/tools')
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from imgtools import lama_window
src=Image.open('/home/claude/kit_raw/Virtual_TryOn_App_Asset_Kit_V1/00_reference/approved_showcase_reference.png').convert('RGB')
W,H=src.size
m=Image.new('L',(W,H),0); d=ImageDraw.Draw(m)
d.rectangle((470,36,1262,238),fill=255)     # headline + subtitle
d.rectangle((14,246,1662,726),fill=255)     # phones
d.rectangle((14,728,1662,872),fill=255)     # captions
half=src.resize((W//2,H//2),Image.LANCZOS)
mh=np.asarray(m.resize((W//2,H//2),Image.NEAREST))>0
img=np.asarray(half).copy()
hw=W//2; hh=H//2
# 3 overlapping 470px-tall windows across the width (each resized to 512 inside lama_window)
outs=[]
boxes=[(0,0,470,hh),(300,0,770,hh),(566,0,836,hh)]
res=img.copy().astype(np.float32)
acc=np.zeros_like(res); wsum=np.zeros(res.shape[:2],np.float32)
for (x0,y0,x1,y1) in boxes:
    o=lama_window(img,mh,(x0,y0,x1,y1)).astype(np.float32)
    w=np.zeros(res.shape[:2],np.float32)
    ramp=np.ones(x1-x0,np.float32); r=60
    if x0>0: ramp[:r]=np.linspace(0,1,r)
    if x1<hw: ramp[-r:]=np.linspace(1,0,r)
    w[y0:y1,x0:x1]=ramp[None,:]
    acc+=o*w[...,None]; wsum+=w
out=acc/np.maximum(wsum,1e-6)[...,None]
out=np.where(mh[...,None],out,img)
full=Image.fromarray(np.clip(out,0,255).astype(np.uint8)).resize((W,H),Image.LANCZOS)
# keep original pixels outside the mask (sharper), feather the seam
mf=m.filter(ImageFilter.GaussianBlur(4))
comp=Image.composite(full,src,mf)
comp.save('/home/claude/assets_work/board_plate.png')
comp.save('/home/claude/vto-prototype/assets/backgrounds/showcase-room.webp','WEBP',quality=80,method=6)
comp.resize((836,470)).save('/home/claude/scratch/board_plate_small.png')
print('ok')
