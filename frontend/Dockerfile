# syntax=docker/dockerfile:1
# =====================================================================
# Filo & Navaja · frontend (React + Vite + Tailwind)
#   dev  → servidor de Vite con recarga en caliente (puerto 5173)
#   prod → build estático servido por Nginx (puerto 80)
# =====================================================================

# ---------- dependencias (capa en caché mientras no cambie el lockfile)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- desarrollo
FROM deps AS dev
ENV CHOKIDAR_USEPOLLING=true
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------- build de producción
FROM deps AS build
# Vite incrusta estas variables en el bundle al compilar. Son públicas
# (URL del proyecto y llave publishable). Nunca pases la service_role.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_ENABLE_REALTIME=true
ARG VITE_DEMO_MODE=false
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_ENABLE_REALTIME=$VITE_ENABLE_REALTIME \
    VITE_DEMO_MODE=$VITE_DEMO_MODE
COPY . .
RUN test -n "$VITE_SUPABASE_URL" || (echo "Falta VITE_SUPABASE_URL (revisa el .env)" && exit 1)
RUN npm run build

# ---------- producción
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1
