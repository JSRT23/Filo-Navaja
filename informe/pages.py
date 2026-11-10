import json,subprocess,re
m=json.load(open("meta.json"))
n=int(re.search(r"Pages:\s+(\d+)",subprocess.run(["pdfinfo","informe.pdf"],capture_output=True,text=True).stdout).group(1))
pages=[]
for i in range(1,n+1):
    t=subprocess.run(["pdftotext","-f",str(i),"-l",str(i),"-layout","informe.pdf","-"],capture_output=True,text=True).stdout
    pages.append([l.strip() for l in t.splitlines() if l.strip()])
def norm(s): return re.sub(r"\s+"," ",s).strip()
def find(text,start):
    tx=norm(text)
    for pi in range(start,n):
        L=pages[pi]
        for a in range(len(L)):
            acc=""
            for b in range(a,min(a+3,len(L))):
                acc=norm(acc+" "+L[b])
                if acc==tx: return pi
                if not tx.startswith(acc): break
    return None
# primer pagina de cuerpo: donde aparece "Informe de cierre del proyecto «"
body=next(i for i,L in enumerate(pages) if i>2 and any(l.startswith("Informe de cierre del proyecto «") for l in L))
res={}; cur=body
for _,t,i in m["heads"]:
    p=find(t,cur)
    if p is None: print("NO",t); continue
    res[i]=p+1; cur=p
cur=body
for k in range(1,m["ntables"]+1):
    p=find(f"Tabla {k}",cur)
    if p is None: print("NOT",k); continue
    res[f"T{k}"]=p+1; cur=p
cur=body
for k in range(1,m["nfigs"]+1):
    p=find(f"Figura {k}",cur); 
    if p is None: print("NOF",k); continue
    res[f"F{k}"]=p+1; cur=p
json.dump(res,open("pages.json","w")); print(body+1,n,len(res))
