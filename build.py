"""Rebuild the iframe HTML and root-level install ZIP for Dynamic Time Board."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
root=Path(__file__).resolve().parent
html=(root/'src/template.html').read_text(encoding='utf-8')
html=html.replace('/*LOGIC*/',(root/'src/logic.js').read_text(encoding='utf-8').rstrip())
html=html.replace('/*APP*/',(root/'src/app.js').read_text(encoding='utf-8').rstrip())
(root/'index.html').write_text(html,encoding='utf-8')
dist=root/'dist'
dist.mkdir(exist_ok=True)
out=dist/'SuperProductivity_DynamicTimeBoard_v1.1.0.zip'
with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=9) as z:
    for n in ('manifest.json','plugin.js','index.html'):
        z.write(root/n,arcname=n)
print('Built:',out)
