"""Build precise, reviewed difference targets from aligned, unmodified HOME artwork.
Pixel differences propose boundaries only; eligibility, grouping and review are curated.
Display uses the actual difference silhouette. Clicking has a separate 8px tolerance.
"""
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter
SIZE=128
EXCLUDED={
 9:'花盖斑点分布变化覆盖整个花盖，不适合局部找不同',
 42:'当前模型整体轮廓同时变化，无法可靠隔离獠牙差异',
 46:'性别差异在尾部背面，当前视角看不到黑点',
 51:'腹部纹路变化分散且面积较大',
 80:'背鳍缺口在当前视角过小且被身体遮挡',
 81:'背鳍差异被当前视角遮挡',
 82:'背鳍差异被当前视角遮挡',
 83:'全身颜色与花纹大面积变化',
 84:'全身颜色大面积变化',
 89:'腹部大面积颜色变化',
 90:'当前视角无法可靠区分胸毛长度',
 95:'头部饰羽和腹部外形大面积变化',
 96:'全身配色和外形大面积变化',
 97:'全身配色和外形大面积变化',
 98:'火炎狮鬃毛及体型整体变化',
 99:'超能妙喵配色和外形整体变化',
 100:'爱管侍姿态和全身外形整体变化',
 101:'幽尾玄鱼全身配色和花纹整体变化',
 102:'飘香豚配色和外形整体变化',
}
# Restrict pixel-derived candidates to the actual anatomical trait. Coordinates
# are in percent of the original artwork, not the cropped body. Multiple boxes
# explicitly separate independent visible locations.
ROIS={
 0:[(40,28,26,14)], 1:[(8,49,40,18),(58,49,37,18)],
 2:[(0,46,28,15),(30,44,30,15)],3:[(0,26,20,23),(30,34,29,22)],
 4:[(58,29,27,31)],5:[(61,59,36,23)],
 6:[(42,40,22,21)],7:[(37,34,30,48)],
 8:[(26,37,53,28)],10:[(18,43,49,23)],11:[(13,37,35,25),(59,37,35,25)],
 12:[(30,48,13,31),(46,44,17,34)],13:[(24,37,16,38),(41,32,15,43),(58,38,16,37)],
 14:[(26,48,58,21)],15:[(27,55,23,20)],16:[(7,32,25,17)],17:[(42,22,10,24)],
 18:[(10,17,20,28)],19:[(45,53,24,21)],20:[(12,47,14,46),(34,49,16,41)],
 21:[(5,31,15,21),(25,39,12,30)],22:[(70,41,29,23)],
 23:[(39,17,18,16),(57,15,15,16)],24:[(24,2,21,24),(45,3,27,25)],
 25:[(23,0,16,24),(39,1,29,27)],26:[(46,76,19,9)],
 27:[(36,9,30,16)],28:[(47,33,18,23)],29:[(40,24,24,18)],
 30:[(2,29,23,27),(77,33,22,27)],31:[(38,24,33,64)],
 32:[(12,2,53,36)],33:[(27,35,36,29)],34:[(30,50,49,20)],
 35:[(63,64,32,24)],36:[(5,19,32,12)],37:[(46,56,20,20)],
 38:[(43,0,26,43)],39:[(59,0,33,24)],40:[(47,0,12,35)],
 41:[(7,35,24,23),(75,35,22,23)],43:[(7,61,13,25),(68,65,28,30)],
 44:[(26,3,16,24),(44,1,19,24)],45:[(0,38,36,14),(43,53,18,21)],
 47:[(38,7,29,25)],48:[(20,18,23,31)],49:[(14,13,20,20),(40,21,40,18)],
 50:[(48,23,8,30),(78,39,15,16)],52:[(22,15,58,28)],
 53:[(66,65,33,26),(17,20,17,18)],54:[(11,34,20,24),(70,34,24,25)],
 55:[(38,24,11,19)],56:[(36,59,21,33)],57:[(29,23,62,30)],
 58:[(18,53,15,21),(73,41,15,20)],59:[(31,29,50,20)],
 60:[(30,26,22,14),(51,26,20,14)],61:[(42,46,12,12)],
 62:[(18,8,37,60)],63:[(31,58,36,26)],
 64:[(32,31,25,17)],65:[(34,28,15,10)],66:[(38,27,14,15)],
 67:[(29,50,21,24),(48,50,23,24)],68:[(36,28,12,16),(63,29,15,16)],
 69:[(24,26,45,16)],70:[(19,34,30,17),(53,34,28,17)],
 71:[(47,14,28,28),(26,74,15,14)],72:[(26,13,18,22),(7,47,22,24),(45,48,18,24),(70,76,20,15)],
 73:[(19,5,45,33)],74:[(39,28,38,26)],75:[(36,53,15,13)],
 76:[(30,43,13,17)],77:[(37,48,18,20)],78:[(45,48,21,23)],
 79:[(38,18,21,18)],85:[(24,43,40,21)],86:[(38,37,19,25)],
 87:[(76,60,21,25)],88:[(80,52,20,32)],
 91:[(10,40,22,17),(71,40,22,17)],92:[(17,12,19,22)],
 93:[(67,6,23,21),(69,77,23,22)],94:[(7,30,30,65),(44,34,26,61)],
}
# Corrected against the original 512px artwork and difference contact sheets.
ROIS.update({
 1:[(33,66,11,12),(54,61,17,18)],
 2:[(19,53,11,10),(48,64,25,9)],
 4:[(77,19,14,23)],5:[(89,70,11,14)],
 6:[(46,35,7,9),(52,29,6,9),(56,32,7,8),(54,39,8,8)],
 7:[(23,72,7,10),(32,73,8,10),(38,48,8,10),(26,48,7,9)],
 12:[(44,43,12,16),(57,35,13,23)],
 17:[(62,32,11,16)],19:[(34,62,20,19)],22:[(65,54,16,15)],
 26:[(51,64,14,9)],28:[(62,41,9,13)],35:[(10,72,22,23)],
 39:[(46,4,30,27)],40:[(61,8,15,32)],
 44:[(12,9,22,27),(32,9,20,19)],
 45:[(5,70,24,15),(48,69,13,16)],
 49:[(11,21,11,15),(59,21,19,16)],
 50:[(53,20,14,23),(68,32,21,17)],
 55:[(50,9,15,20)],58:[(44,37,20,17),(77,35,18,14)],
 63:[(14,55,24,23)],64:[(25,31,22,18)],65:[(30,27,17,16)],66:[(18,18,15,16)],
 71:[(53,27,16,18),(33,87,15,11),(52,87,8,11)],
 72:[(28,18,16,20),(5,45,25,22),(43,46,24,21),(59,82,15,12),(49,83,8,10)],
 74:[(52,52,34,27)],76:[(21,50,12,12)],77:[(51,46,20,25)],78:[(48,51,26,29)],
 79:[(39,33,16,20),(54,34,17,19)],85:[(34,45,38,28)],
 87:[(58,59,19,21)],88:[(14,74,14,17),(45,72,24,26)],
 92:[(29,26,15,16)],93:[(30,12,19,18),(65,76,20,17)],
 94:[(0,42,40,43),(49,37,27,48)],
})
EXCLUDED[36]='当前侧前方视角仅露出细小牙尖，无法可靠比较牙齿组'
EXCLUDED[62]='当前两张美纳斯图片的身体和尾部轮廓同时变化，不能可靠隔离眉须差异'

pairs=json.loads(Path('data/gender-wiki.json').read_text(encoding='utf-8'))
def rect(box):
 x0,y0,x1,y1=box
 return dict(x=x0/SIZE,y=y0/SIZE,width=(x1-x0)/SIZE,height=(y1-y0)/SIZE)
def path(mask):
 # Horizontal runs preserve the actual changed-pixel silhouette.
 out=[]
 for y in range(SIZE):
  x=0
  while x<SIZE:
   if not mask[y*SIZE+x]:x+=1;continue
   start=x
   while x<SIZE and mask[y*SIZE+x]:x+=1
   out.append(f'M{start*4} {y*4}h{(x-start)*4}v4h{-(x-start)*4}z')
 return ''.join(out)
def components(mask):
 unseen={i for i,v in enumerate(mask) if v};result=[]
 while unseen:
  start=unseen.pop();stack=[start];group={start}
  while stack:
   p=stack.pop();x,y=p%SIZE,p//SIZE
   for dy in (-1,0,1):
    for dx in (-1,0,1):
     nx,ny=x+dx,y+dy;n=ny*SIZE+nx
     if 0<=nx<SIZE and 0<=ny<SIZE and n in unseen:
      unseen.remove(n);stack.append(n);group.add(n)
  result.append(group)
 return result
annotations=[]
for index,pair in enumerate(pairs):
 entry=dict(pairIndex=index,speciesId=pair['id'],label=pair['label'],detail=pair['detail'],verified=True,eligible=index not in EXCLUDED,exclusionReason=EXCLUDED.get(index),targets=[],regions={'male':[],'female':[]})
 if not entry['eligible']:
  annotations.append(entry);continue
 ims=[]
 for side in ('male','female'):
  a=Image.open(pair[side]).convert('RGBA').resize((512,512))
  b=Image.new('RGBA',a.size,(245,242,234,255));b.alpha_composite(a)
  ims.append(b.convert('RGB'))
 diff=ImageChops.difference(*ims);channels=diff.split()
 intensity=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),channels[2])
 # Resize after threshold so even narrow changed features remain discoverable.
 raw=intensity.point(lambda v:255 if v>=42 else 0).resize((SIZE,SIZE),Image.Resampling.BOX).point(lambda v:255 if v>=28 else 0)
 for roiIndex,roi in enumerate(ROIS[index]):
  x,y,w,h=roi;bounds=(int(x*SIZE/100),int(y*SIZE/100),min(SIZE,int((x+w)*SIZE/100)+1),min(SIZE,int((y+h)*SIZE/100)+1))
  selected=Image.new('L',(SIZE,SIZE));selected.paste(raw.crop(bounds),bounds[:2])
  # Remove isolated rendering speckles, retain changed outlines/colour blocks.
  clean=[0]*(SIZE*SIZE)
  for group in components(list(selected.getdata())):
   if len(group)>=3:
    for pixel in group:clean[pixel]=255
  if sum(v>0 for v in clean)<4:continue
  core=Image.new('L',(SIZE,SIZE));core.putdata(clean);box=core.getbbox()
  region=rect(box)
  if region['width']*region['height']>.18:
   entry['eligible']=False;entry['exclusionReason']='当前图片差异分散过广，无法作为准确的局部题';entry['targets']=[];break
  hit=core.filter(ImageFilter.MaxFilter(5))
  mask=[''.join('1' if hit.getpixel((x,y)) else '0' for x in range(SIZE)) for y in range(SIZE)]
  target=dict(id=f'{index}-{roiIndex}',label=f'差异 {len(entry["targets"])+1}',regions={'male':[region],'female':[region]},outline=path(clean),mask=mask)
  entry['targets'].append(target)
 if entry['eligible'] and not entry['targets']:
  entry['eligible']=False;entry['exclusionReason']='当前图片没有足够清晰、可可靠定位的性别差异'
 for target in entry['targets']:
  for side in ('male','female'):entry['regions'][side].extend(target['regions'][side])
 annotations.append(entry)
Path('data/gender-hotspots.json').write_text(json.dumps(annotations,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Eligible:',sum(p['eligible'] for p in annotations),'Excluded:',sum(not p['eligible'] for p in annotations))
print('Targets:',sum(len(p['targets']) for p in annotations),'Multi-location:',[(p['pairIndex'],len(p['targets'])) for p in annotations if len(p['targets'])>1])
