import re,subprocess,sys,json,html as H
from bs4 import BeautifulSoup
PASS_PAGES=json.load(open("pages.json")) if len(sys.argv)>1 and sys.argv[1]=="2" else {}

subprocess.run(["pandoc","-f","gfm","-t","html","--wrap=none","body.md","-o","body.html"],check=True)
soup=BeautifulSoup(open("body.html").read(),"html.parser")

TITLES=["Resumen de indicadores del proyecto: plan y cierre","Datos generales del proyecto","Objetivos específicos y resultados al cierre","Registro de aceptación y firmas","Componentes construidos y evidencia verificada","Indicadores de desempeño del producto","Indicadores de beneficio del negocio","Requerimientos funcionales y su implementación","Requerimientos no funcionales y su estado","Desviaciones y cambios de alcance","Cumplimiento del cronograma por actividad","Presupuesto aprobado y costo final por paquete de la EDT","Detalle de las adquisiciones","Pagos y devolución al propietario","Estado de resultados mensual de referencia de la barbería antes del sistema","Beneficio mensual esperado del sistema","Sensibilidad del retorno según el beneficio logrado","Criterios de aceptación y resultado de la validación","Productos entregados y evidencia de validación","Matriz de cumplimiento de entregables","Registro de riesgos finales","Registro de incidentes y problemas resueltos","Elementos entregados al área operativa","Sesiones de capacitación","Manuales suministrados","Responsables del soporte posterior","Instrumento de la encuesta de satisfacción","Resultados de la encuesta por dimensión","Resultados de la encuesta por grupo","Inventario de activos entregados","Documentación técnica final","Recomendaciones y responsables","Guía rápida de uso por rol","Lista de asistencia a las sesiones de capacitación","Evidencias técnicas del proyecto","Fuentes y valores de referencia utilizados"]
FIGS=["Curva de recuperación de la inversión según el beneficio logrado","Arquitectura de la solución"]
FIGNOTE=["Elaboración propia con los supuestos de la sección 7: costo de COP 18.550.486, beneficio de COP 1.831.000 al mes y costo recurrente de la nube desde el mes 13. Los círculos indican el mes de recuperación.","Elaboración propia a partir de la documentación de arquitectura del repositorio. Las líneas discontinuas son tareas programadas."]
CLASS="Clase: Verificado = dato del repositorio, las pruebas o la base de datos; Referencia de mercado = fuente pública (Anexo D); Ilustrativo = valor del caso de estudio por sustituir con el dato real."
NOTES={11:"COP = pesos colombianos. Contingencia = 10 % de la línea base de costos.",14:"Elaboración propia con datos de la Fase 1 y referencias de mercado (Anexo D). Cifras mensuales en COP.",15:"Elaboración propia con los supuestos de la Fase 1, mantenidos por coincidir con los precios de Montería."}
SMALLFONT=lambda n: n>=5

tables=soup.find_all("table"); assert len(tables)==36,len(tables)
for i,t in enumerate(tables,1):
    for c in t.find_all("colgroup"): c.decompose()
    for tag in t.find_all(["td","th"]):
        txt=tag.get_text().strip()
        if len(txt)<=17 and not tag.find("code") and " " not in txt.strip("() ")[:0]+txt.replace("  "," ") or len(txt)<=11: tag["class"]=tag.get("class",[])+["nw"]
        if re.fullmatch(r"[−-]?[\d.]+(,\d+)?( al año)?",txt): tag["class"]=tag.get("class",[])+["num"]
    for tr in t.find_all("tr"):
        tds=tr.find_all("td")
        if tds and all(not x.get_text().strip() for x in tds): tr["class"]=["blank"]
    if i==33:
        for td in t.find_all("td")[2::3]:
            parts=re.split(r"(?<=[.\w\)\"”]) (?=\d\. )",td.get_text())
            td.clear()
            for k,pt in enumerate(parts):
                if k: td.append(soup.new_tag("br"))
                td.append(pt)
    heads=[th.get_text().strip() for th in t.find_all("th")]
    nrows=len(t.find_all("tr"))
    ncol=len(heads)
    wrap=soup.new_tag("div"); wrap["id"]=f"tabla-{i}"; wrap["class"]=["tbl"]+(["keep"] if nrows<=11 else [])+(["wide"] if ncol>=6 else [])
    lab=soup.new_tag("p"); lab["class"]=["cap-label"]; lab.string=f"Tabla {i}"
    ti=soup.new_tag("p"); ti["class"]=["cap-title"]; ti.string=TITLES[i-1]
    note_parts=[NOTES.get(i,"Elaboración propia.")]
    if "Clase" in heads or "Clase" in " ".join(heads): note_parts.append(CLASS)
    tf=soup.new_tag("tfoot"); tr=soup.new_tag("tr"); td=soup.new_tag("td"); td["colspan"]=str(ncol); td["class"]=["tbl-note"]
    em=soup.new_tag("em"); em.string="Nota. "; td.append(em); td.append(" ".join(note_parts)); tr.append(td); tf.append(tr); t.append(tf)
    t.insert_before(wrap); wrap.append(lab); wrap.append(ti); wrap.append(t.extract())

# figuras
for n,mark in ((1,"FIGURA1MARK"),(2,"FIGURA2MARK")):
    p=[x for x in soup.find_all("p") if x.get_text().strip()==mark][0]
    d=soup.new_tag("div"); d["id"]=f"figura-{n}"; d["class"]=["fig"]
    lab=soup.new_tag("p"); lab["class"]=["cap-label"]; lab.string=f"Figura {n}"
    ti=soup.new_tag("p"); ti["class"]=["cap-title"]; ti.string=FIGS[n-1]
    im=soup.new_tag("img"); im["src"]=f"fig{n}.png"; im["alt"]=FIGS[n-1]
    nt=soup.new_tag("p"); nt["class"]=["tbl-note"]; em=soup.new_tag("em"); em.string="Nota. "; nt.append(em); nt.append(FIGNOTE[n-1])
    for x in (lab,ti,im,nt): d.append(x)
    p.replace_with(d)

# referencias
REFS=[
"AgendaPro. (s. f.). <em>Planes y precios para Colombia</em>. Recuperado el 9 de noviembre de 2026, de https://agendapro.com/co/planes-int",
"Congreso de Colombia. (2012). <em>Ley Estatutaria 1581 de 2012, por la cual se dictan disposiciones generales para la protección de datos personales</em>.",
"Consultorsalud. (s. f.). <em>Aumento del salario mínimo en Colombia 2026</em>. Recuperado el 9 de noviembre de 2026, de https://consultorsalud.com/aumento-del-salario-minimo-en-colombia-2026/",
"Dólar Colombia. (2026). <em>Dólar en Colombia: TRM del 6 de noviembre de 2026</em>. Recuperado el 9 de noviembre de 2026, de https://www.dolar-colombia.com/2026-11-06",
"Dynadot. (s. f.). <em>Registro de dominios .com.co</em>. Recuperado el 9 de noviembre de 2026, de https://www.dynadot.com/es/dominio/com.co",
"Fresha. (s. f.). <em>John’s BarberClub Montería, Carrera 28 #9-2</em>. Recuperado el 9 de noviembre de 2026, de https://www.fresha.com/a/johns-barberclub-monteria-carrera-28-9-2-llrg5gf7",
"International Organization for Standardization. (2023). <em>ISO/IEC 25010:2023. Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model</em>.",
"La República. (2018). <em>El auge de las barberías mueve US$280 millones al año en Colombia</em>. https://www.larepublica.co/ocio/el-auge-de-las-barberias-mueve-us280-millones-al-ano-en-colombia-2766025",
"Modelos de plan de negocios. (s. f.). <em>¿Cuánto cuesta montar una barbería en Colombia?</em> Recuperado el 9 de noviembre de 2026, de https://modelosdeplandenegocios.com/blogs/news/cuanto-cuesta-montar-barberia-colombia",
"Portafolio. (s. f.). <em>¿Cuánto gana un desarrollador de software en Colombia?</em> Recuperado el 9 de noviembre de 2026, de https://www.portafolio.co/economia/empleo/cuanto-gana-un-desarrollador-de-software-en-colombia-627749",
"Presidencia de la República de Colombia. (1989). <em>Decreto 624 de 1989, por el cual se expide el Estatuto Tributario de los impuestos administrados por la Dirección General de Impuestos Nacionales</em>.",
"Project Management Institute. (2021). <em>Guía de los fundamentos para la dirección de proyectos (Guía del PMBOK) y El estándar para la dirección de proyectos</em> (7.ª ed.). PMI.",
"Pulzo. (s. f.). <em>¿Cuánto gana un barbero, peluquero o estilista en Colombia?</em> Recuperado el 9 de noviembre de 2026, de https://www.pulzo.com/economia/cuanto-gana-barbero-peluquero-estilista-colombia-2024-PP4048755",
"Ramos Torralvo, J., Cardona, I., y Burgos, J. (2026a). <em>Fase 1. Iniciación del proyecto de Gestión de TI: Sistema web de gestión integral para Barbería Filo &amp; Navaja, Montería</em> [Trabajo de curso no publicado]. Universidad Cooperativa de Colombia.",
"Ramos Torralvo, J., Cardona, I., y Burgos, J. (2026b). <em>Fase 2. Planeación del proyecto de Gestión de TI: Sistema web de gestión integral para Barbería Filo &amp; Navaja, Montería</em> [Trabajo de curso no publicado]. Universidad Cooperativa de Colombia.",
"Ramos Torralvo, J., Cardona, I., y Burgos, J. (2026c). <em>Filo-Navaja: sistema de gestión para Barbería Filo &amp; Navaja</em> [Código fuente]. GitHub. https://github.com/JSRT23/Filo-Navaja",
"Samsung Colombia. (s. f.). <em>Galaxy Tab A9+ Wi-Fi, 128 GB (SM-X210)</em>. Recuperado el 9 de noviembre de 2026, de https://www.samsung.com/co/tablets/galaxy-tab-a/galaxy-tab-a9-plus-wifi-mystic-silver-128gb-sm-x210nzsecoo/",
"Talently. (s. f.). <em>Salario de un desarrollador full stack en Colombia</em>. Recuperado el 9 de noviembre de 2026, de https://talently.tech/herramientas/colombia/salario/developer/fullstack-developer",
"Toolradar. (2026). <em>Supabase pricing 2026</em>. Recuperado el 9 de noviembre de 2026, de https://toolradar.com/blog/supabase-pricing-2026",
]
rp=[x for x in soup.find_all("p") if x.get_text().strip()=="REFERENCIASMARK"][0]
rh=soup.new_tag("h2"); rh.string="Referencias"; rh["id"]="referencias"; rh["class"]=["unnum"]
rd=BeautifulSoup('<div class="refs">'+"".join(f"<p>{r}</p>" for r in REFS)+"</div>","html.parser")
rp.replace_with(rh); rh.insert_after(rd)

# ids y TOC
heads=[]
for k,h in enumerate(soup.find_all(["h2","h3"])):
    h["id"]=h.get("id") or f"h{k}"
    heads.append((h.name,h.get_text().strip(),h["id"]))
    h["class"]=h.get("class",[])+(["l1"] if h.name=="h2" else ["l2"])+(["annex"] if h.get_text().startswith("16.") else [])
body=str(soup)

def row(text,pg,cls,href):
    return f'<a class="toc-row {cls}" href="#{href}"><span class="t">{text}</span><span class="d"></span><span class="p">{pg}</span></a>'
toc="".join(row(t,PASS_PAGES.get(i,"0"),"r1" if n=="h2" else "r2",i) for n,t,i in heads)
lot="".join(row(f"Tabla {i}. {t}",PASS_PAGES.get(f"T{i}","0"),"r1",f"tabla-{i}") for i,t in enumerate(TITLES,1))
lof="".join(row(f"Figura {i}. {t}",PASS_PAGES.get(f"F{i}","0"),"r1",f"figura-{i}") for i,t in enumerate(FIGS,1))

css=open("style.css").read()
title='''<section class="titlepage">
<p class="tp-title"><strong>Entrega final. Cierre del proyecto de Gestión de TI</strong></p>
<p class="tp-title"><strong>Informe de cierre del proyecto «Sistema web de gestión integral para Barbería Filo &amp; Navaja, Montería»</strong></p>
<p class="tp-line">&nbsp;</p>
<p class="tp-line">Juan Ramos Torralvo</p><p class="tp-line">Irwin Cardona</p><p class="tp-line">Juan Burgos</p>
<p class="tp-line">&nbsp;</p>
<p class="tp-line">Universidad Cooperativa de Colombia</p>
<p class="tp-line">Electiva Específica IV</p>
<p class="tp-line">Docente: Mariele Cogollo</p>
<p class="tp-line">29 de enero de 2027</p>
</section>'''
front=f'''<section class="front"><h1 class="fh">Contenido</h1>{toc}</section>
<section class="front"><h1 class="fh">Lista de tablas</h1>{lot}<h1 class="fh gap">Lista de figuras</h1>{lof}</section>'''
doc=f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe de cierre del proyecto · Barbería Filo &amp; Navaja</title><style>{css}</style></head><body>{title}{front}<section class="main"><h1 class="doctitle">Informe de cierre del proyecto «Sistema web de gestión integral para Barbería Filo &amp; Navaja, Montería»</h1>{body}</section></body></html>'
open("informe.html","w").write(doc)
json.dump({"heads":heads,"ntables":len(TITLES),"nfigs":len(FIGS),"titles":TITLES,"figs":FIGS},open("meta.json","w"),ensure_ascii=False)

from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page()
    import os; pg.goto("file://"+os.path.abspath("informe.html")); pg.wait_for_load_state("networkidle")
    hdr='<div style="width:100%;text-align:right;font-family:\'Liberation Serif\',\'Times New Roman\',serif;font-size:12pt;padding-right:1in;"><span class="pageNumber"></span></div>'
    pg.pdf(path="informe.pdf",format="Letter",margin={"top":"1in","bottom":"1in","left":"1in","right":"1in"},display_header_footer=True,header_template=hdr,footer_template="<span></span>",print_background=True,outline=True,tagged=True)
    b.close()
print("pdf ok")
