from PIL import Image,ImageDraw
from pathlib import Path
import json
pairs=json.loads(Path('data/gender-wiki.json').read_text(encoding='utf-8'))
regions=json.loads(Path('data/gender-hotspots.json').read_text(encoding='utf-8'))
Path('qa/hotspots').mkdir(parents=True,exist_ok=True)
for page in range(7):
    out=Image.new('RGB',(1024,1024),'white');draw=ImageDraw.Draw(out)
    for slot,pair in enumerate(pairs[page*16:(page+1)*16]):
        index=page*16+slot;x=slot%4*256;y=slot//4*256
        draw.text((x+4,y+4),f'{index}: #{pair["id"]}',fill='black')
        for side,gender in enumerate(['male','female']):
            src=Image.open(pair[gender]).convert('RGBA').resize((120,120),Image.Resampling.LANCZOS)
            ox=x+side*128;oy=y+64
            out.paste(src,(ox,oy),src)
            for r in regions[index]['regions'][gender]:
                draw.rectangle((ox+r['x']*120,oy+r['y']*120,ox+(r['x']+r['width'])*120,oy+(r['y']+r['height'])*120),outline='#00a866',width=2)
    out.save(f'qa/hotspots/{page}.png')
print('Seven annotated review sheets saved')
