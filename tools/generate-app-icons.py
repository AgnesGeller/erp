"""Az ERP D betűs ikonjai. Futtatás az ERP mappájában: python tools/generate-app-icons.py."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BACKGROUND = '#214a35'
FONT = Path('C:/Windows/Fonts/arialbd.ttf')

# Nagy felbontásból kicsinyítünk: a favicon is éles, a betű optikailag középen van.
canvas = Image.new('RGB', (1024, 1024), BACKGROUND)
font = ImageFont.truetype(str(FONT), 850)
box = font.getbbox('D')
scale = 594 / max(box[2] - box[0], box[3] - box[1])
font = ImageFont.truetype(str(FONT), round(850 * scale))
box = font.getbbox('D')
x = (1024 - (box[2] - box[0])) / 2 - box[0]
y = (1024 - (box[3] - box[1])) / 2 - box[1]
ImageDraw.Draw(canvas).text((x, y), 'D', font=font, fill='#ffffff')
for filename, size in [('icon-d-512-v1.png', 512), ('icon-d-192-v1.png', 192),
                       ('apple-touch-icon-d-v1.png', 180), ('favicon-d-v1.png', 32)]:
    canvas.resize((size, size), Image.Resampling.LANCZOS).save(ROOT / 'assets' / filename, optimize=True)
print('Negy ERP-ikon elkeszult.')