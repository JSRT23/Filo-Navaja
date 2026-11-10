import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
plt.rcParams["font.family"]="Liberation Serif"
plt.rcParams["font.size"]=11
C=18.550486; REC=1.22/12
def gain(b,m):
    return b*m-C-(REC*(m-12) if m>12 else 0)
series=[("100 % del beneficio",1.831,"#111111","-",2.2),("70 % del beneficio",1.2817,"#555555","--",1.8),("50 % del beneficio",0.9155,"#8a8a8a",":",2.2)]
fig,ax=plt.subplots(figsize=(6.5,3.9),dpi=240)
ms=[i/10 for i in range(0,241)]
pb={}
for name,b,col,ls,lw in series:
    ys=[gain(b,m) for m in ms]
    ax.plot(ms,ys,color=col,ls=ls,lw=lw,label=name)
    # payback
    for m,y in zip(ms,ys):
        if y>=0: pb[name]=m;break
ax.axhline(0,color="#222",lw=0.8)
ax.axvline(12,color="#bbb",lw=0.7,ls=(0,(2,3)))
ax.text(12.2,-17.6,"mes 12: empieza el costo\nrecurrente de la nube",fontsize=8.5,color="#555",va="bottom")
pts={"100 % del beneficio":(10.1,(-3.2,5.2)),"70 % del beneficio":(14.7,(0.5,5.0)),"50 % del beneficio":(21.3,(-1.7,-5.6))}
cols={n:c for n,_,c,_,_ in series}
for n,(m,off) in pts.items():
    ax.plot([m],[0],"o",ms=6,mfc="white",mec=cols[n],mew=1.6,zorder=5)
    ax.annotate(f"{m:.1f} meses".replace(".",","),xy=(m,0),xytext=(m+off[0],off[1]),fontsize=9.5,color=cols[n],
                arrowprops=dict(arrowstyle="-",color=cols[n],lw=0.8))
ax.annotate("Inversión: −18,6",xy=(0,-C),xytext=(0.4,-C-1.3),fontsize=9)
ax.set_xlim(0,24); ax.set_ylim(-21,28)
ax.set_xticks(range(0,25,3))
ax.set_xlabel("Meses desde la salida a producción"); ax.set_ylabel("Ganancia neta acumulada\n(millones de COP)")
for s in ("top","right"): ax.spines[s].set_visible(False)
ax.grid(axis="y",color="#e5e5e5",lw=0.6); ax.set_axisbelow(True)
ax.legend(loc="upper left",frameon=False,fontsize=9.5)
fig.tight_layout()
fig.savefig("fig1.png")
print(pb)
