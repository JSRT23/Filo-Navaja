# Informe de cierre

Fuente y PDF del informe de cierre del proyecto.

- `informe.md`: texto del informe (editar aquí).
- `Informe_de_Cierre_Barberia_Filo_y_Navaja_APA.pdf`: versión entregada.
- `prep.py`, `build.py`, `pages.py`, `style.css`: generan el PDF en formato APA 7.
- `fig.py`, `fig2.py`, `fig2.dot`, `fig1.png`, `fig2.png`: figuras.

## Regenerar el PDF
Requiere `pandoc`, Python con `beautifulsoup4` y `playwright`, y `poppler-utils`. Desde esta carpeta:

```
python3 prep.py && python3 build.py && python3 pages.py && python3 build.py 2
cp informe.pdf Informe_de_Cierre_Barberia_Filo_y_Navaja_APA.pdf
```

Los archivos intermedios (`body.md`, `body.html`, `informe.html`, `informe.pdf`, `meta.json`, `pages.json`) se generan solos.
