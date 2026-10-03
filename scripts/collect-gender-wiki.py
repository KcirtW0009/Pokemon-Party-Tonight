import json,re
from pathlib import Path
from bs4 import BeautifulSoup
source='https://wiki.52poke.com/zh-hans/拥有性别差异的宝可梦列表'
soup=BeautifulSoup(Path('assets/gender-source.html').read_text(encoding='utf-8'),'html.parser')
entries=[]
for table in soup.select('table'):
 rows=table.select('tr')
 for index,row in enumerate(rows):
  cells=row.find_all(['td','th'],recursive=False)
  imgs=row.select('img')
  if len(imgs)!=2 or len(cells)<4:continue
  text=cells[0].get_text(' ',strip=True)
  if not re.fullmatch(r'\d{3,4}',text):continue
  pid=int(text);label=cells[1].get_text(' ',strip=True)
  next_cells=rows[index+1].find_all('td',recursive=False) if index+1<len(rows) else []
  detail=next_cells[0].get_text(' ',strip=True) if len(next_cells)==1 else '比较两种性别的外观差异'
  pair={'id':pid,'label':label,'detail':detail,'verified':False,'source':source}
  for gender,img in zip(['male','female'],imgs):
   src=img['src'];src='https:'+src if src.startswith('//') else src
   # Use original files, preserving the same HOME render family and canvas.
   src=re.sub(r'/thumb/([^/]+/[^/]+/[^/]+)/[^/]+$',r'/\1',src)
   src=src.replace('https://s1.52poke.com/','https://media.52poke.com/')
   pair[gender+'Source']=src;pair[gender]=f'assets/gender-wiki/{len(entries)}/{gender}.png'
  entries.append(pair)
Path('data/gender-wiki.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Collected {len(entries)} species/form pairs')
