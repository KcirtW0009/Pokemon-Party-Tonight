"""Manually authored trait regions, normalized to each original square HOME PNG.

Reviewed against all seven 103-pair contact sheets. Regions deliberately cover
the relevant anatomical part, rather than requiring a tiny changed pixel tap.
Original sprite files are never modified.
"""
import json
from pathlib import Path
from PIL import Image

# x, y, width, height in percent; semicolon means a second acceptable trait area.
rows = '''
42,30,22,28
3,47,30,30;60,47,36,30
7,50,34,29
6,27,36,33
62,17,33,44
58,32,38,35
40,23,25,28
24,40,43,37
21,31,56,31
8,22,85,48
27,31,34,36
13,32,72,34
27,31,54,37
25,29,45,49
13,52,68,32
10,38,39,30
1,32,43,30
47,22,27,25
4,8,32,36
38,47,35,32
1,51,51,44
1,26,30,40
54,32,39,43
32,1,51,32
23,1,50,35
21,7,40,29
28,40,52,45
25,0,53,30
55,24,25,30
30,12,43,27
2,28,23,34;60,28,24,34
32,13,47,74
9,17,56,28
34,12,29,27
30,49,35,23
62,56,28,37
6,31,55,29
32,57,39,38
28,0,32,44
8,4,50,31
50,7,20,36
15,35,68,31
16,61,58,28
0,59,32,35;68,61,29,30
11,1,37,31
21,56,32,31
27,26,55,50
43,7,36,33
33,9,40,28
24,2,29,33
34,11,47,48
31,42,58,42
34,9,53,31
39,48,54,38
25,5,51,29
40,35,24,25
31,45,33,42
45,23,48,36
36,18,48,49
42,28,48,38
27,12,57,46
32,26,25,24
15,28,48,48
42,20,31,24
25,23,33,28
27,15,29,22
24,20,29,24
8,23,71,52
26,23,53,30
32,17,29,31
10,38,65,33
34,5,37,29;27,64,48,28
26,9,41,31;35,63,42,22
1,4,61,45
13,0,58,41
21,51,23,23
21,17,43,33
34,39,23,35
33,36,34,43
26,23,34,31
54,21,35,29
44,19,29,27
49,34,25,35
4,36,84,57
11,16,83,75
15,49,33,23
21,39,27,30
59,49,24,32
32,35,50,50
21,40,51,35
13,42,51,35
9,6,66,40
12,32,37,28
58,78,22,16;66,8,29,19
4,36,55,51
8,11,62,76
21,17,61,65
5,13,83,60
24,10,55,53
18,18,66,69
22,6,62,68
7,41,86,26
14,25,63,59
'''.strip().splitlines()
pairs=json.loads(Path('data/gender-wiki.json').read_text(encoding='utf-8'))
assert len(rows)==len(pairs)==103
annotations=[]
rows[5]='58,49,40,30'
rows[62]='0,2,55,95'
rows[71]='42,28,35,28;27,64,48,28'
rows[93]='65,78,30,20;32,7,25,20'
rows[94]='4,36,55,55;61,33,37,57'
for i,(pair,row) in enumerate(zip(pairs,rows)):
    rects=[dict(zip(('x','y','width','height'),[float(v)/100 for v in part.split(',')])) for part in row.split(';')]
    masks={}
    for gender in ('male','female'):
        alpha=Image.open(pair[gender]).convert('RGBA').getchannel('A')
        masks[gender]=[''.join('1' if alpha.crop((x*alpha.width//32,y*alpha.height//32,(x+1)*alpha.width//32,(y+1)*alpha.height//32)).getextrema()[1]>32 else '0' for x in range(32)) for y in range(32)]
    annotations.append({'pairIndex':i,'speciesId':pair['id'],'label':pair['label'],'detail':pair['detail'],'verified':True,'regions':{'male':rects,'female':rects},'masks':masks})
Path('data/gender-hotspots.json').write_text(json.dumps(annotations,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('103 manually authored hotspot pairs written')
