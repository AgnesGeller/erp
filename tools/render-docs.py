"""A magyar ERP-dokumentacio harom mentheto PDF-valtozata.

Csak a repository Markdown- es SVG-forrasait olvassa; adatbazishoz nem kapcsolodik.
Futtatas: python tools/render-docs.py
Fuggoseg: reportlab. A celkonyvtar: output/pdf.
"""
from pathlib import Path
import re
import argparse
import xml.etree.ElementTree as ET
from html import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, LongTable, TableStyle, PageBreak, KeepTogether, Image
from reportlab.graphics.shapes import Drawing, Rect, String, PolyLine, Polygon

parser = argparse.ArgumentParser(description="Magyar ERP-dokumentacio PDF-exportja")
parser.add_argument("--only", choices=["01","02","03"], help="Csak a kivalasztott dokumentum ujrageneralasa")
ARGS = parser.parse_args()
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)
FONTS = Path("C:/Windows/Fonts")
if not (FONTS / "arial.ttf").exists():
    raise SystemExit("Hianyzik az Arial font. Allits be magyar ekezeteket tamogato TTF fontot.")
pdfmetrics.registerFont(TTFont("Arial", str(FONTS / "arial.ttf")))
pdfmetrics.registerFont(TTFont("Arial-Bold", str(FONTS / "arialbd.ttf")))
pdfmetrics.registerFont(TTFont("Arial-Italic", str(FONTS / "ariali.ttf")))
pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial-Italic", boldItalic="Arial-Bold")

GREEN = colors.HexColor("#214a35")
LIGHT = colors.HexColor("#edf2e8")
TEXT = colors.HexColor("#24372c")
MUTED = colors.HexColor("#596a5e")
PAGE_W, PAGE_H = A4
MARGIN = 43
WIDTH = PAGE_W - 2 * MARGIN
styles = {
    "body": ParagraphStyle("body", fontName="Arial", fontSize=10, leading=14, textColor=TEXT, spaceAfter=7, splitLongWords=True, allowWidows=0, allowOrphans=0),
    "h1": ParagraphStyle("h1", fontName="Arial-Bold", fontSize=22, leading=27, textColor=GREEN, spaceAfter=15, keepWithNext=True),
    "h2": ParagraphStyle("h2", fontName="Arial-Bold", fontSize=14, leading=18, textColor=GREEN, spaceBefore=16, spaceAfter=8, keepWithNext=True),
    "h3": ParagraphStyle("h3", fontName="Arial-Bold", fontSize=11, leading=15, textColor=GREEN, spaceBefore=12, spaceAfter=7, keepWithNext=True),
    "bullet": ParagraphStyle("bullet", fontName="Arial", fontSize=10, leading=14, textColor=TEXT, leftIndent=13, firstLineIndent=-10, spaceAfter=4),
    "cell": ParagraphStyle("cell", fontName="Arial", fontSize=8.1, leading=11.4, textColor=TEXT, splitLongWords=True),
    "th": ParagraphStyle("th", fontName="Arial-Bold", fontSize=8.1, leading=11.4, textColor=colors.white, splitLongWords=True),
    "note": ParagraphStyle("note", fontName="Arial-Italic", fontSize=8.8, leading=12, textColor=MUTED, spaceAfter=8),
}

def normal(text):
    return text.replace("\u2011", "-").replace("\u2013", "-").replace("\u2014", "-")

def inline(text):
    text = normal(text.strip())
    text = re.sub(r"!\[([^]]*)\]\(([^)]+)\)", lambda m: m.group(1), text)
    # Linkeket elobb helyettesitjuk, hogy a sajat HTML ne legyen ujra escape-elve.
    links = []
    def link(match):
        label, target = match.group(1), match.group(2)
        if not target.startswith(("http://", "https://", "mailto:")):
            target = "https://github.com/AgnesGeller/erp/blob/main/" + target.lstrip("./")
        token = "LINKTOKEN" + str(len(links)) + "END"
        links.append('<link href="' + escape(target, quote=True) + '" color="#214a35"><u>' + escape(label) + '</u></link>')
        return token
    text = re.sub(r"\[([^]]+)\]\(([^)]+)\)", link, text)
    text = escape(text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`([^`]+)`", r'<font name="Arial">\1</font>', text)
    for index, markup in enumerate(links):
        text = text.replace("LINKTOKEN" + str(index) + "END", markup)
    return text

def para(text, kind="body"):
    return Paragraph(inline(text), styles[kind])

def paint(value):
    if value.startswith("#") and len(value) == 4:
        value = "#" + "".join(char * 2 for char in value[1:])
    return colors.HexColor(value)

def svg_diagram(path):
    root = ET.parse(path).getroot()
    width, height = float(root.get("width")), float(root.get("height"))
    draw = Drawing(width, height)
    ns = "{http://www.w3.org/2000/svg}"
    for item in root.iter():
        tag = item.tag.removeprefix(ns)
        if tag == "rect":
            x, y, w, h = [float(item.get(key, 0)) for key in ("x", "y", "width", "height")]
            fill = item.get("fill", "#ffffff")
            stroke = item.get("stroke")
            draw.add(Rect(x, height-y-h, w, h, rx=float(item.get("rx",0)), ry=float(item.get("rx",0)),
                          fillColor=paint(fill) if fill != "none" else None,
                          strokeColor=paint(stroke) if stroke else None,
                          strokeWidth=float(item.get("stroke-width",1))))
        elif tag == "text":
            draw.add(String(float(item.get("x")), height-float(item.get("y")),
                            normal("".join(item.itertext())), fontName="Arial-Bold" if item.get("font-weight")=="700" else "Arial",
                            fontSize=float(item.get("font-size",17)), fillColor=GREEN))
        elif tag == "path" and item.get("stroke"):
            command = item.get("d","")
            parts = re.findall(r"[MHVL]|-?\d+(?:\.\d+)?",command)
            points = []
            i, x, y = 0, 0.0, 0.0
            while i < len(parts):
                op = parts[i]; i += 1
                if op in ("M","L"):
                    x, y = float(parts[i]), float(parts[i+1]); i += 2
                elif op == "H":
                    x = float(parts[i]); i += 1
                elif op == "V":
                    y = float(parts[i]); i += 1
                else:
                    raise ValueError("Nem tamogatott SVG-vonal: " + command)
                points.extend([x,height-y])
            draw.add(PolyLine(points,strokeColor=GREEN,strokeWidth=2,strokeDashArray=[7,5] if item.get("stroke-dasharray") else None))
            def arrowhead(tip, previous):
                dx,dy=tip[0]-previous[0],tip[1]-previous[1]
                length=(dx*dx+dy*dy)**0.5
                if length == 0: return
                dx,dy=dx/length,dy/length
                back=(tip[0]-9*dx,tip[1]-9*dy)
                draw.add(Polygon([tip[0],tip[1],back[0]+4*dy,back[1]-4*dx,back[0]-4*dy,back[1]+4*dx],fillColor=GREEN,strokeColor=GREEN))
            if item.get("marker-start"): arrowhead(points[0:2],points[2:4])
            if item.get("marker-end"): arrowhead(points[-2:],points[-4:-2])
    scale=WIDTH/width
    draw.scale(scale,scale)
    draw.width,draw.height=WIDTH,height*scale
    return draw

def table(rows):
    count=len(rows[0])
    if count == 2: widths=[WIDTH*0.29,WIDTH*0.71]
    elif count == 3: widths=[WIDTH*0.23,WIDTH*0.37,WIDTH*0.40]
    elif count == 4: widths=[WIDTH*0.19,WIDTH*0.27,WIDTH*0.34,WIDTH*0.20]
    else: widths=[WIDTH/count]*count
    wrapped = [[para(cell,"th" if ri==0 else "cell") for cell in row] for ri,row in enumerate(rows)]
    t=LongTable(wrapped,colWidths=widths,repeatRows=1,hAlign="LEFT",spaceBefore=5,spaceAfter=11)
    commands=[
        ("BACKGROUND",(0,0),(-1,0),GREEN),
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),7),
        ("RIGHTPADDING",(0,0),(-1,-1),7),
        ("TOPPADDING",(0,0),(-1,-1),7),
        ("BOTTOMPADDING",(0,0),(-1,-1),7),
        ("LINEBELOW",(0,0),(-1,0),0.7,GREEN),
    ]
    for r in range(1,len(rows)):
        if r%2: commands.append(("BACKGROUND",(0,r),(-1,r),LIGHT))
        commands.append(("LINEBELOW",(0,r),(-1,r),0.3,colors.HexColor("#d3dfcf")))
    t.setStyle(TableStyle(commands))
    return t

def markdown(path, drop_title=False):
    lines=path.read_text(encoding="utf-8-sig").splitlines()
    story=[]; i=0; dropped=False
    while i<len(lines):
        text=lines[i].strip()
        if not text:
            i+=1; continue
        image = re.fullmatch(r"!\[([^]]*)\]\(([^)]+)\)",text)
        if image:
            source=path.parent/image.group(2)
            if source.suffix.lower()==".svg":
                story.append(svg_diagram(source))
                story.append(para(image.group(1),"note"))
            elif source.suffix.lower() in (".png", ".jpg", ".jpeg"):
                from PIL import Image as PILImage
                with PILImage.open(source) as im:
                    width, height = im.size
                scale = min(475/width, 450/height)
                story.append(Image(str(source), width=width*scale, height=height*scale))
                story.append(para(image.group(1), "note"))
            i+=1; continue
        if text.startswith("|") and i+1<len(lines) and re.match(r"^\s*\|?\s*:?-{3}", lines[i+1]):
            rows=[[v.strip() for v in text.strip("|").split("|")]]
            i+=2
            while i<len(lines) and lines[i].strip().startswith("|"):
                row=[v.strip() for v in lines[i].strip().strip("|").split("|")]
                if len(row)!=len(rows[0]): raise ValueError("Hibas tablazatsor: "+lines[i])
                rows.append(row); i+=1
            story.append(table(rows)); continue
        heading=re.match(r"^(#{1,3})\s+(.+)",text)
        if heading:
            if drop_title and len(heading.group(1))==1 and not dropped:
                dropped=True
            else: story.append(para(heading.group(2),"h"+str(len(heading.group(1)))))
            i+=1; continue
        if re.match(r"^[-*]\s+",text):
            story.append(para("• "+re.sub(r"^[-*]\s+","",text),"bullet")); i+=1; continue
        if re.match(r"^\d+\.\s+",text):
            story.append(para(text,"bullet")); i+=1; continue
        if text.startswith(">"):
            story.append(para(text.lstrip("> "),"note")); i+=1; continue
        block=[text]; i+=1
        while i<len(lines) and lines[i].strip() and not re.match(r"^(#{1,3}\s|[-*]\s|\d+\.\s|\||!\[|>)",lines[i].strip()):
            block.append(lines[i].strip()); i+=1
        story.append(para(" ".join(block)))
    return story

def header_footer(label):
    def draw(canvas,doc):
        canvas.saveState()
        canvas.setStrokeColor(GREEN); canvas.setLineWidth(0.6)
        canvas.line(MARGIN,PAGE_H-31,PAGE_W-MARGIN,PAGE_H-31)
        canvas.setFont("Arial-Bold",8)
        canvas.setFillColor(GREEN)
        canvas.drawString(MARGIN,PAGE_H-23,"DÍSZKERTEK")
        canvas.setFont("Arial",7.5); canvas.setFillColor(MUTED)
        canvas.drawRightString(PAGE_W-MARGIN,PAGE_H-23,label)
        canvas.line(MARGIN,32,PAGE_W-MARGIN,32)
        canvas.drawString(MARGIN,20,"Dokumentáció | 2026. október 30. | Nem készre jelentett alkalmazás")
        canvas.drawRightString(PAGE_W-MARGIN,20,str(doc.page))
        canvas.restoreState()
    return draw

def build(filename,title,sections):
    if ARGS.only and not filename.startswith(ARGS.only):
        return
    story=[para(title,"h1"),para("Menthető dokumentáció - 2026. október 30.","note")]
    for index,(path,section_title) in enumerate(sections):
        if index:
            story.append(PageBreak())
            story.append(para(section_title,"h1"))
        story.extend(markdown(ROOT/path,drop_title=True))
    doc=SimpleDocTemplate(str(OUT/filename),pagesize=A4,rightMargin=MARGIN,leftMargin=MARGIN,
                          topMargin=49,bottomMargin=46,title="Díszkertek - "+title,author="Díszkertek",
                          subject="ERP dokumentáció és jóváhagyott fejlesztési irány")
    doc.build(story,onFirstPage=header_footer(title),onLaterPages=header_footer(title))
    print(filename,(OUT/filename).stat().st_size,"bytes")

build("01_Diszkertek_reszletes_adatbazisterv.pdf","Részletes adatbázisterv",[
    ("docs/adatbazisterv.md","Részletes adatbázisterv")])
build("02_Diszkertek_magyar_README.pdf","Magyar README és adatkapcsolati ábra",[
    ("README.md","Magyar README")])
build("03_Diszkertek_kalkulator_es_fejlesztesi_naplo.pdf","Kalkulátor-felmérés és fejlesztési napló",[
    ("docs/kalkulator-felmeres.md","Kalkulátor-felmérés"),
    ("docs/fejlesztesi-naplo.md","Fejlesztési napló és döntések")])
