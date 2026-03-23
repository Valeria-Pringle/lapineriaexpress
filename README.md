# La Pineria Express — Landing Page

Landing page para **La Pineria Express**, negocio de botones pin personalizados en Ensenada, Baja California.

## Cómo correr el proyecto

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

## Estructura

- **`src/app/`** — Página principal y layout (metadata, idioma `es`).
- **`src/components/`** — Secciones de la landing:
  - `Header.tsx` — Navegación fija.
  - `Hero.tsx` — Mensaje principal y problema que resuelve.
  - `Benefits.tsx` — Beneficios de trabajar con La Pineria.
  - `Gallery.tsx` — Galería de trabajos (ahora con placeholders; sustituir por fotos reales).
  - `Pricing.tsx` — Opciones de pedido / cotización.
  - `Footer.tsx` — Redes sociales (Facebook, Instagram, WhatsApp) y créditos.

## Personalización

1. **Redes sociales**  
   En `src/components/Footer.tsx` actualiza los `href` de Facebook, Instagram y WhatsApp (número con código de país, ej. `5216461234567`).

2. **Galería**  
   En `src/components/Gallery.tsx` reemplaza los placeholders por imágenes reales (por ejemplo con `next/image` y fotos en `/public`).

3. **Colores**  
   Tema claro con color primario `#4BD3D6` en `src/app/globals.css` (`:root` y `@theme`).

4. **Textos**  
   Puedes editar títulos, descripciones y planes en cada componente según necesites.

## Scripts

- `npm run dev` — Servidor de desarrollo.
- `npm run build` — Build de producción.
- `npm run start` — Servidor con build de producción.
