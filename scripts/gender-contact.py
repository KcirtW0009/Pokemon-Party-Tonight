from pathlib import Path
from PIL import Image,ImageDraw
import json
pairs=json.loads(Path('data/gender-wiki.json').read_text(encoding='utf-8'))
for page in range((len(pairs)+15)//16):
 out=Image.new('RGB',(1024,1024),'white');draw=ImageDraw.Draw(out)
 for slot,pair in enumerate(pairs[page*16:(page+1)*16]):
  x=slot%4*256;y=slot//4*256
  draw.text((x+4,y+4),f'{page*16+slot}: #{pair["id"]}',fill='black')
  for i,gender in enumerate(['male','female']):
   src=Image.open(pair[gender]).convert('RGBA');src.thumbnail((120,200),Image.Resampling.LANCZOS)
   out.paste(src,(x+i*128+(120-src.width)//2,y+24+(200-src.height)//2),src)
   draw.text((x+i*128+5,y+228),gender,fill='black')
 Path('assets/gender-review').mkdir(exist_ok=True)
 out.save(f'assets/gender-review/{page}.png')
print(f'{len(pairs)} pairs, {(len(pairs)+15)//16} sheets')
