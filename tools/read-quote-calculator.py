"""Az eredeti kalkulátor csak olvasható. Az üzleti árakat kizárólag .local fájlba írja."""
import sys,json,hashlib,openpyxl,re
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
p=Path(sys.argv[1]);w=openpyxl.load_workbook(p,read_only=True,data_only=True)
clean=lambda s:re.sub(r'\s+',' ',str(s or '').replace('_',' ').replace('Füvesités','Füvesítés').replace('kompossztal','komposzttal')).strip()
types=[];lookup={}
for i,r in enumerate(w['Adatbázis'].iter_rows(values_only=True),1):
 if len(r)<9 or not r[1] or not r[2] or not isinstance(r[7],(int,float)) or not isinstance(r[8],(int,float)):continue
 unit=lambda x:clean(x).replace('m2','m²').replace('m3','m³')
 materials=[dict(name=clean(r[j]),factor=str(r[j+1]),unit=unit(r[j+2]),basis='quantity',waste='0',pack='0',capacity='0',unit_price='0',supplier='') for j in [9,12,15,18] if r[j]]
 t=dict(id='xlsx:'+str(i),name=clean(r[2]),category=clean(r[1]),unit=unit(r[5]),unit2=unit(r[6]),mode='excel',main=str(r[7]),auxiliary='0',transport='0',labor=str(r[8]),material_cm='0',labor_cm='0',material_min='0',labor_min='0',total_min='0',internal_info='\n'.join(str(x) for x in [r[3],r[4]] if x),materials=materials,defaults={},source=dict(sheet='Adatbázis',row=i,category=r[1],name=r[2]))
 types.append(t);lookup[(r[1],r[2])]=t['id']
s=w['Minták'];templates=[]
for n,(a,b,titlecol) in enumerate([(1,2,1),(3,4,3),(5,6,6)],1):
 lines=[]
 for row in range(2,9):
  cat=s.cell(row,a).value;name=s.cell(row,b).value
  if name:lines.append(dict(type_id=lookup.get((cat,name)),unresolved=clean(name) if (cat,name) not in lookup else '',params={},optional=False))
 templates.append(dict(id='xlsx-template:'+str(n),name=clean(s.cell(1,titlecol).value),lines=lines))
result=dict(source_sha256=hashlib.sha256(p.read_bytes()).hexdigest(),source_name=p.name,types=types,templates=templates,info_templates=[])
if len(types)!=163 or len(set(t['category'] for t in types))!=22:raise ValueError('A forrás megváltozott; az import felülvizsgálandó.')
Path('.local/catalog-import.json').write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
print(json.dumps(dict(types=len(types),categories=22,templates=len(templates),unresolved=sum(bool(l['unresolved']) for t in templates for l in t['lines']),sha256=result['source_sha256'])))