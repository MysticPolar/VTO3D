import sys; sys.path.insert(0,'/home/claude/tools')
import numpy as np
from PIL import Image, ImageDraw
from imgtools import load, save, lama_window, grow
src='/home/claude/kit_raw/Virtual_TryOn_App_Asset_Kit_V1/01_screens/01_onboarding.png'
img=load(src)
H,W=img.shape[:2]
L=img.astype(int).mean(2)
r,g,b=[img[...,i].astype(int) for i in range(3)]
mask=np.zeros((H,W),bool)
# headline (cream text + soft shadow) and yellow dot
reg=np.zeros_like(mask); reg[140:415,50:545]=True
mask|= reg & (L>125)
yellow=(r>180)&(g>140)&(b<120)&(r-b>80)
dot=np.zeros_like(mask); dot[340:400,470:535]=True
mask|= dot & yellow
mask=grow(mask,10)
# tagline
reg=np.zeros_like(mask); reg[422:528,58:425]=True
mask|= grow(reg & (L>110),6)
# feature boxes (full rounded squares) + texts
box=Image.new('L',(W,H),0); d=ImageDraw.Draw(box)
for y0,y1 in [(618,716),(762,861),(910,1007)]:
    d.rounded_rectangle((60,y0,158,y1),radius=22,fill=255)
mask|= np.asarray(box)>0
reg=np.zeros_like(mask); reg[620:1008,170:360]=True
mask|= grow(reg & (L>110),6)
# buttons
btn=Image.new('L',(W,H),0); d=ImageDraw.Draw(btn)
d.rounded_rectangle((46,1500,818,1630),radius=64,fill=255)
d.rounded_rectangle((46,1637,818,1767),radius=64,fill=255)
mask|= np.asarray(btn)>0
save((mask*255).astype(np.uint8),'/home/claude/assets_work/onb_mask.png')
out=img
# windows (x0,y0,x1,y1)
for box in [(0,90,620,710),(0,560,520,1080),(0,1290,560,1822),(303,1290,863,1822)]:
    out=lama_window(out,mask,box)
save(out,'/home/claude/assets_work/onboarding_clean.png')
print('done')
