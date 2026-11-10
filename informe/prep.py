import re
md=open("informe.md").read()
i=md.index("## 1. Introducción"); md=md[i:]
# figuras
md=re.sub(r"&#91;embedded content: cálculo propio[^\n]*\n","FIGURA1MARK\n",md)
md=re.sub(r"&#91;embedded content: arquitectura[^\n]*\n","FIGURA2MARK\n",md)
# referencias cruzadas
md=md.replace("(Tabla 2)","(Tabla 2 de la Fase 2)")
md=md.replace("La tabla arma un estado","La Tabla 15 arma un estado")
md=md.replace("la tabla muestra qué pasa","la Tabla 17 muestra qué pasa")
md=md.replace("La línea azul es el caso del plan. Las grises muestran","En la Figura 1, la línea continua es el caso del plan; las discontinuas muestran")
md=md.replace("se resume en el siguiente dibujo","se resume en la Figura 2")
md=md.replace("el Anexo de fuentes","el Anexo D").replace("citada en el Anexo D","citada en el Anexo D")
md=md.replace("[Documento con las 15 cuentas, uno por rol](https://claude.ai/artifact/HzZPDNWzvjGHNHJfg8dtuz)","Documento «Cuentas de demostración» (15 cuentas, una por rol)")
# citas
CIT={"dolar":("Dólar Colombia","2026"),"consultorsalud":("Consultorsalud","s. f."),"toolradar":("Toolradar","2026"),
"dynadot":("Dynadot","s. f."),"samsung":("Samsung Colombia","s. f."),"fresha":("Fresha","s. f."),
"modelos":("Modelos de plan de negocios","s. f."),"pulzo":("Pulzo","s. f."),"larepublica":("La República","2018"),
"agenda":("AgendaPro","s. f."),"talently":("Talently","s. f."),"portafolio":("Portafolio","s. f.")}
def key(u):
    for k,v in [("dolar-colombia","dolar"),("consultorsalud","consultorsalud"),("toolradar","toolradar"),("dynadot","dynadot"),("samsung.com","samsung"),("fresha","fresha"),("modelosdeplandenegocios","modelos"),("pulzo","pulzo"),("larepublica","larepublica"),("agendapro","agenda"),("talently","talently"),("portafolio","portafolio")]:
        if k in u: return v
    raise Exception(u)
md=md.replace("([precio](https://toolradar.com/blog/supabase-pricing-2026), [TRM](https://www.dolar-colombia.com/2026-11-06))","(Toolradar, 2026; Dólar Colombia, 2026)")
md=md.replace("[Toolradar](https://toolradar.com/blog/supabase-pricing-2026); la página","Toolradar (2026); la página")
md=md.replace("[Samsung Colombia](https://www.samsung.com/co/tablets/galaxy-tab-a/galaxy-tab-a9-plus-wifi-mystic-silver-128gb-sm-x210nzsecoo/); el precio","Samsung Colombia (s. f.); el precio")
md=md.replace("[Talently](https://talently.tech/herramientas/colombia/salario/developer/fullstack-developer), [Portafolio](https://www.portafolio.co/economia/empleo/cuanto-gana-un-desarrollador-de-software-en-colombia-627749)","Talently (s. f.); Portafolio (s. f.)")
def paren(m):
    a,y=CIT[key(m.group(2))]; return f"({a}, {y})"
md=re.sub(r"\(\[([^\]]+)\]\((https?://[^)]+)\)\)",paren,md)
def tab(m):  # celdas de Anexo D con solo un enlace
    a,y=CIT[key(m.group(2))]; return f"{m.group(1)}{a} ({y})"
md=re.sub(r"(?m)(\| )\[([^\]]+)\]\((https?://[^)]+)\)( \|)$",lambda m:f"{m.group(1)}{CIT[key(m.group(3))][0]} ({CIT[key(m.group(3))][1]}){m.group(4)}",md)
def gen(m):
    a,y=CIT[key(m.group(2))]; return f"{m.group(1)} ({a}, {y})" if m.group(1).lower() not in ("pulzo","agendapro") else f"{m.group(1)} ({y})"
md=re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)",gen,md)
# citas formales
def rep(a,b):
    global md
    assert a in md,a
    md=md.replace(a,b,1)
rep("que el acta de constitución y el plan de la Fase 2 prometieron.","que el acta de constitución y el plan de la Fase 2 prometieron (Ramos Torralvo et al., 2026a, 2026b).")
rep("sigue la estructura de cierre de la Guía del PMBOK","sigue la estructura de cierre de la Guía del PMBOK (Project Management Institute [PMI], 2021)")
rep("se aplicaron ISO/IEC 25010, la Ley 1581 de 2012 y","se aplicaron ISO/IEC 25010 (International Organization for Standardization [ISO], 2023), la Ley 1581 de 2012 (Congreso de Colombia, 2012) y")
rep("del artículo 114-1 del Estatuto Tributario; sin ella","del artículo 114-1 del Estatuto Tributario (Presidencia de la República, 1989); sin ella")
rep("### Anexo C. Evidencias técnicas\n\n","### Anexo C. Evidencias técnicas\n\nEl código fuente, las migraciones y las pruebas están en el repositorio del proyecto (Ramos Torralvo et al., 2026c).\n\n")
rep("| Documentos de Fase 1 y 2 | Fase1\\_Barberia\\_Filo\\_y\\_Navaja.docx y Fase2\\_Planeacion\\_Barberia\\_Filo\\_y\\_Navaja.docx |","| Documentos de Fase 1 y 2 | Fase1\\_Barberia\\_Filo\\_y\\_Navaja.docx y Fase2\\_Planeacion\\_Barberia\\_Filo\\_y\\_Navaja.docx (Ramos Torralvo et al., 2026a, 2026b) |")
# marcador de referencias antes de Anexos
md=md.replace("## 16. Anexos y evidencias","REFERENCIASMARK\n\n## 16. Anexos y evidencias")
assert "](http" not in md, re.findall(r"\]\(http[^)]*\)",md)
open("body.md","w").write(md)
