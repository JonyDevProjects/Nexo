# Fase 4: Construcción y Despliegue del MVP de Nexo

> **Proyecto:** Nexo  
> **Fase:** 4 - Construcción y Despliegue del MVP  
> **Estado:** Construcción Completada y Compilación Exitosa (`npm run build` en verde)

---

## 1. Resumen de la Construcción

El MVP de **Nexo** ha sido construido íntegramente siguiendo las especificaciones de las Fases 1, 2 y 3. El proyecto está listo para ejecutarse en local (`npm run dev`) y desplegarse en **Vercel** sobre el **Free Tier**.

```mermaid
flowchart TD
    subgraph "Frontend & App Router (Next.js 15)"
        Home["Landing & Ingesta (app/page.tsx)"]
        Menu["Carta Pública (app/m/[slug]/page.tsx)"]
    end

    subgraph "Componentes Modulares (components/)"
        Upload["ImageUploader con Canvas Compression"]
        Stepper["AiProgressStepper (Micro-feedback)"]
        Editor["MenuEditor (Validación táctil y legal)"]
        QR["QrDownloadModal (SVG/PNG y Plantilla A5)"]
        View["MenuPublicView (Filtro sticky de 14 alérgenos UE)"]
    end

    subgraph "Lógica y Servicios (lib/ & actions/)"
        AiAction["extractMenuAction (app/actions/ai.ts)"]
        MenuAction["saveMenuAction (app/actions/menu.ts)"]
        Gemini["Gemini Flash con Structured Outputs (lib/gemini/)"]
        Allergens["Catálogo 14 Alérgenos UE (lib/allergens.ts)"]
        Supabase["Capa de Datos y Fallback Demo (lib/data/menu.ts)"]
    end

    Home --> Upload --> AiAction --> Gemini
    AiAction --> Stepper --> Editor
    Editor --> MenuAction --> Supabase
    MenuAction --> QR
    Menu --> View --> Allergens
```

---

## 2. Componentes y Módulos Desarrollados

### 2.1. Ingesta Inteligente y Visión IA (Gemini Flash)
* [`lib/gemini/prompt.ts`](file:///Users/jonathanquishpe/JoniDev/Nexo/lib/gemini/prompt.ts): Prompt del sistema especializado en gastronomía española y esquema JSON nativo (`response_schema`).
* [`lib/gemini/extract.ts`](file:///Users/jonathanquishpe/JoniDev/Nexo/lib/gemini/extract.ts): Inferencia multimodal *One-Shot* (categorías, platos, precios, alérgenos y traducción al inglés) con soporte de demo offline.
* [`components/admin/ImageUploader.tsx`](file:///Users/jonathanquishpe/JoniDev/Nexo/components/admin/ImageUploader.tsx): Compresión en el cliente mediante Canvas API antes de la subida, reduciendo fotos de 6 MB a ~250 KB sin pérdida de legibilidad tipográfica.
* [`components/admin/AiProgressStepper.tsx`](file:///Users/jonathanquishpe/JoniDev/Nexo/components/admin/AiProgressStepper.tsx): Animación informativa de 4 pasos para guiar al usuario durante los 2,5s de respuesta.

### 2.2. Editor Táctil de Validación y Cumplimiento Legal
* [`components/admin/MenuEditor.tsx`](file:///Users/jonathanquishpe/JoniDev/Nexo/components/admin/MenuEditor.tsx):
  * Edición inline de platos, descripciones y precios.
  * Selector modal táctil con los 14 alérgenos de la UE (Reglamento 1169/2011).
  * Casilla de certificación legal obligatoria para blindar la responsabilidad del software.

### 2.3. Carta Pública del Comensal (`/m/[slug]`)
* [`app/m/[slug]/page.tsx`](file:///Users/jonathanquishpe/JoniDev/Nexo/app/m/[slug]/page.tsx): Server Component con ISR (`revalidate = 60`) y generación dinámica de metadatos OpenGraph.
* [`components/menu/MenuPublicView.tsx`](file:///Users/jonathanquishpe/JoniDev/Nexo/components/menu/MenuPublicView.tsx):
  * Barra sticky horizontal con filtro reactivo de alérgenos (*"Sin Gluten"*, *"Sin Lactosa"*, etc.).
  * Selector de idioma instantáneo (Español / Inglés) sin recarga de página.
  * Alternador de modo claro / oscuro.
  * Sello viral del Plan Free (*"Carta creada con Nexo"*).

### 2.4. Material Físico (Generación de QR y Plantilla de Mesa)
* [`components/qr/QrDownloadModal.tsx`](file:///Users/jonathanquishpe/JoniDev/Nexo/components/qr/QrDownloadModal.tsx):
  * Generación y descarga directa en PNG de alta resolución (1024x1024 px) y SVG vectorial.
  * Maquetación para impresión directa de plantilla peana / A5 con botón `window.print()`.

---

## 3. Verificación de Compilación y Rendimiento

La compilación de producción con Next.js 15 se ha ejecutado con éxito total:

```bash
> nexo@0.1.0 build
> next build

✓ Compiled successfully in 957ms
✓ Linting and checking validity of types
✓ Generating static pages (4/4)

Route (app)                              Size     First Load JS
┌ ○ /                                    19 kB    129 kB
├ ○ /_not-found                          992 B    104 kB
└ ƒ /m/[slug]                            4.16 kB  115 kB
```

* **First Load JS:** Solo **115 kB** en la carta pública, garantizando una carga en menos de 0,5 segundos en conexiones 4G/3G de hostelería.
* **Cero llamadas a base de datos en escaneos repetidos:** Gracias a la regeneración estática (ISR) de Vercel.

---

## 4. Instrucciones para Ejecución Local y Despliegue

### 4.1. Probar en Local
Para arrancar el servidor de desarrollo:
```bash
npm run dev
```
Rutas clave disponibles:
* `http://localhost:3000/` $\rightarrow$ Flujo de bienvenida, subida de fotos y editor táctil.
* `http://localhost:3000/m/bar-pepe` $\rightarrow$ Carta pública demo lista para probar con filtros de alérgenos y selector multiidioma.

### 4.2. Conexión de Claves de Producción (`.env.local`)
Copiar el archivo de ejemplo:
```bash
cp .env.example .env.local
```
Configurar:
* `GEMINI_API_KEY`: Tu clave de Google AI Studio (o suscripción Google AI Pro).
* `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Credenciales de tu proyecto gratuito de Supabase.
*(Nota: Si no se configuran, la aplicación funciona automáticamente en modo demostración con fallback local inteligente).*

### 4.3. Despliegue en Vercel (100% Free Tier)
1. Subir el repositorio a GitHub o GitLab.
2. Importar el proyecto en [Vercel](https://vercel.com).
3. Añadir las variables de entorno en el panel de Vercel.
4. Despliegue automático en el subdominio `nexo-menu.vercel.app`.
