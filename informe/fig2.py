import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
plt.rcParams["font.family"]="Liberation Serif"
fig=plt.figure(figsize=(6.5,5.7),dpi=240); ax=fig.add_axes([0,0,1,1]); ax.set_xlim(0,6.5); ax.set_ylim(0.9,5.65); ax.axis("off")
def cluster(x0,y0,x1,y1,label,fill="none"):
    ax.add_patch(FancyBboxPatch((x0,y0),x1-x0,y1-y0,boxstyle="round,pad=0,rounding_size=0.08",fc=fill,ec="#888",lw=1))
    ax.text(x0+0.1,y1-0.1,label,fontsize=10.5,va="top",ha="left")
def box(x0,x1,yc,txt,fill="white",h=0.62,fs=8.3):
    ax.add_patch(FancyBboxPatch((x0,yc-h/2),x1-x0,h,boxstyle="round,pad=0,rounding_size=0.07",fc=fill,ec="#222",lw=1))
    ax.text((x0+x1)/2,yc,txt,fontsize=fs,ha="center",va="center",linespacing=1.15)
def arr(p,q,dash=False,rad=0):
    ax.add_patch(FancyArrowPatch(p,q,arrowstyle="-|>",mutation_scale=9,lw=1,color="#333",ls=(0,(4,3)) if dash else "-",connectionstyle=f"arc3,rad={rad}",shrinkA=0,shrinkB=0))
def line(pts,dash=False):
    xs,ys=zip(*pts); ax.plot(xs[:-1],ys[:-1],color="#333",lw=1,ls=(0,(4,3)) if dash else "-")
    arr(pts[-2],pts[-1],dash)
cluster(0.1,4.5,4.35,5.58,"Clientes")
box(0.25,2.2,4.95,"Aplicación web React + Vite\n(clientes, recepción,\nbarberos y administración)",h=0.66)
box(2.45,4.2,4.95,"Tablet de la sede\n(kiosco de asistencia)",h=0.66)
box(5.0,6.35,4.95,"Resend\ncorreo transaccional",fill="#ececec",h=0.66)
cluster(0.1,1.05,6.4,4.12,"Supabase")
box(0.25,1.45,3.55,"Auth\ncorreo y contraseña")
box(1.65,2.95,3.55,"Storage\navatars · barbers\ncatalog")
box(3.15,4.45,3.55,"API (PostgREST)\ntablas + funciones\nRPC")
box(4.8,6.3,3.55,"Edge Functions\nadmin-create-staff\ndelete-my-account\nprocess-email-outbox",h=0.8,fs=7.6)
cluster(0.22,1.12,6.28,2.97,"Postgres","#f1f1f1")
box(0.4,1.95,2.3,"Tablas con RLS\n26 tablas, 49 políticas")
box(2.75,4.3,2.3,"Funciones de negocio\n(security definer)")
box(4.95,6.1,2.3,"pg_cron\n3 tareas",h=0.55)
box(2.75,4.3,1.55,"Triggers\ninventario, comisiones,\nauditoría y correos",h=0.62,fs=8)
# flechas
arr((0.85,4.6),(0.85,3.87))                    # web -> auth
arr((1.6,4.6),(2.1,3.87))                      # web -> storage
arr((2.05,4.6),(3.35,3.87))                    # web -> api
line([(1.0,4.6),(1.0,4.3),(5.2,4.3),(5.2,3.97)])  # web -> edge (rutea por el hueco)
arr((3.9,4.6),(3.9,3.87))                      # kiosco -> api
arr((5.65,3.97),(5.65,4.62))                   # edge -> resend
arr((3.6,3.24),(3.6,2.62))                     # api -> funciones
arr((3.25,3.24),(1.5,2.62),rad=0.0)            # api -> tablas
arr((3.5,1.99),(3.5,1.87))                     # funciones -> triggers
arr((4.95,2.3),(4.3,2.3),dash=True)            # cron -> funciones
ax.text(4.62,2.4,"cada\n15 min",fontsize=7.5,ha="center",va="bottom",linespacing=1.0)
arr((5.55,2.58),(5.55,3.15),dash=True)         # cron -> edge
ax.text(5.48,2.85,"cada 2 min",fontsize=7.5,ha="right",va="center")
fig.savefig("fig2.png")
