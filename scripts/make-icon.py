from PIL import Image, ImageDraw
from pathlib import Path
folder = Path('src-tauri/icons'); folder.mkdir(parents=True, exist_ok=True)
im = Image.new('RGBA', (1024, 1024), (0,0,0,0)); d = ImageDraw.Draw(im)
d.rounded_rectangle((30,30,994,994), radius=230, fill='#355e4c')
for x, y in [(248,248),(548,248),(248,548),(548,548)]:
    d.rounded_rectangle((x,y,x+228,y+228), radius=48, fill='#f5f8ed')
im.save(folder/'icon.png')
im.save(folder/'icon.ico', sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
im.save(folder/'icon.icns')
