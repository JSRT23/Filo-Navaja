// Fotografías con Licencia Unsplash (uso libre, comercial incluido). Se citan en el pie de página.
const u = (id, w = 1600, q = 70) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=${q}`;

export const PHOTOS = {
  hero: {
    id: 'photo-1672642150228-3fcd5826ec26',
    alt: 'Barbero cortando el cabello de un cliente con vapor de toalla caliente',
    author: 'Redd Francisco',
  },
  shop: {
    id: 'photo-1702865272115-5afdbae975af',
    alt: 'Silla de barbería frente al espejo',
    author: 'Redd Francisco',
  },
  chair: {
    id: 'photo-1621645582931-d1d3e6564943',
    alt: 'Silla de barbero negra con detalles plateados',
    author: 'Joshua Lawrence',
  },
  beard: {
    id: 'photo-1494873446894-adbfecfc407a',
    alt: 'Arreglo de barba en blanco y negro',
    author: 'Adam Sherez',
  },
  cut: {
    id: 'photo-1634480257305-7f4ca3582e6a',
    alt: 'Hombre recibiendo un corte de cabello',
    author: 'Hair Spies',
  },
  room: {
    id: 'photo-1611313151697-d626e818dddf',
    alt: 'Silla de cuero negro en un salón claro',
    author: 'Caio Coelho',
  },
  scissors: {
    id: 'photo-1731655257703-99d690707781',
    alt: 'Tijeras de barbero en primer plano',
    author: 'Mehmet Talha Onuk',
  },
};

export function photoUrl(key, width = 1600, quality = 70) {
  const p = PHOTOS[key];
  return p ? u(p.id, width, quality) : null;
}

export function photoSrcSet(key, widths = [640, 960, 1280, 1920]) {
  return widths.map((w) => `${photoUrl(key, w)} ${w}w`).join(', ');
}

/** Foto de portada por sede */
export const BRANCH_PHOTO = { 'la-castellana': 'shop', centro: 'chair' };
