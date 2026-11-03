# Informe de Estado del MVP y Lecciones Aprendidas (Pre-Release 1.0)

> **Fecha:** 1 de noviembre de 2026 (Documento Vivo en constante actualización)  
> **Proyecto:** Nexo (Micro-SaaS para Hostelería Española)  
> **Rama:** `develop`  
> **Objetivo:** Documentar de forma iterativa los aprendizajes técnicos, arquitectura de inferencia, soluciones a incidencias y el estado de validación del MVP antes de la primera release a producción.

---

## 1. Resumen Ejecutivo

Durante la fase de pruebas y validación del MVP de **Nexo**, se auditó el ciclo de vida completo de la plataforma: desde la ingesta fotográfica de cartas físicas hasta la entrega optimizada en Edge ISR con código QR y peana A5 imprimible.

Se verificó el cumplimiento de todos los paquetes de trabajo (**WP-1 a WP-5**), alcanzando un **100% de éxito en los tests automatizados**:
- **Test de Campo / SLA Piloto:** 23/23 PASS (TTV: 53.0s frente a un SLA máximo de 180s; contraste QR 21:1; estilos de impresión A5).
- **Seguridad y RLS (Supabase):** 28/28 PASS (Aislamiento multi-inquilino estricto y prevención de escalada de privilegios).
- **Benchmark de IA:** 3/3 PASS (Recall del 100% en los 14 alérgenos de la normativa europea 1169/2011).
- **Verificación Estática de Tipos:** 0 errores TypeScript (`npx tsc --noEmit`).

---

## 2. Lecciones Aprendidas y Hallazgos Críticos

### 2.1. Gestión de Inferencia: Control Híbrido Cloud vs. Local

#### **Problema Detectado:**
Al iniciar pruebas locales de digitalización, las peticiones fallaban con un error HTTP 401 de Google:
`[401 Unauthorized] ACCESS_TOKEN_TYPE_UNSUPPORTED`.
La variable `GEMINI_API_KEY` configurada en el sistema era un token OAuth de cuenta interna (`AQ.Ab8RN6K...`) y no una API Key estándar de Google AI Studio (`AIzaSy...`).

#### **Aprendizaje y Solución:**
1. **Desacoplar la inferencia del entorno rígido:** Una aplicación en desarrollo no debe depender exclusivamente de una clave fija en variables de entorno.
2. **Panel de Control de Inferencia (`InferenceControlPanel`):**
   - Se diseñó un panel accesible desde la interfaz principal que permite alternar dinámicamente entre motores: **Auto**, **LiteRT Híbrido**, **LiteRT Simple**, **Ollama Local**, **Gemini Flash (Cloud)** y **Mock de Prueba**.
   - Permite al usuario introducir y almacenar su propia `GEMINI_API_KEY` en `localStorage` con opción de borrado seguro.
   - Incluye sondeo en tiempo real de la disponibilidad de puertos locales (`:11436`, `:11435`, `:11434`) y un botón de fallback directo a Mock en caso de caída para no bloquear la experiencia de usuario.

---

### 2.2. Arquitectura de Inferencia Local Dual (LiteRT + Apple Metal GPU)

Para permitir pruebas 100% privadas y locales sin coste de tokens ni conexión a internet, se implementó un daemon de dos fases (`scripts/litert-service.ts`) corriendo sobre aceleración de hardware Metal:

| Fase | Puerto | Modelo Asignado | Responsabilidad | Rendimiento Empírico |
| :--- | :--- | :--- | :--- | :--- |
| **Paso 1: Visión** | `http://127.0.0.1:11436` | `qwen3-vl:8B` | OCR tabular rápido, extracción de columnas, secciones y precios en euros. | ~21 tokens/segundo |
| **Paso 2: Razonamiento** | `http://127.0.0.1:11435` | `gemma4:26b-a4b-it-q4_K_M` (MoE) | Aplicación de heurística culinaria española, deducción de los 14 alérgenos UE, traducción al inglés y emisión JSON. | ~31.5 tokens/segundo |

---

### 2.3. Comportamiento de "Thinking Tokens" en Modelos de Última Generación

#### **Problema Detectado:**
En los primeros ensayos con `qwen3-vl:8B` y `gemma4:26b`, la transcripción devolvía `0 caracteres`.
Al analizar la traza de Ollama, se descubrió que los modelos pasaban por una fase de pensamiento profundo (`thinking phase`) de más de 6.000 caracteres antes de emitir la respuesta visible.
Si el parámetro `num_predict` (o `max_tokens`) era bajo (ej. 2.000-2.500 tokens), el modelo consumía todo el presupuesto de tokens en el pensamiento y finalizaba con `done_reason: length` con el campo `message.content` completamente vacío `""`.

#### **Aprendizaje y Solución:**
1. **Ampliación de Ventana de Predicción:** Se fijó `num_predict >= 4096` tanto en visión como en razonamiento para asegurar que el pensamiento no trunque la emisión del contenido final.
2. **Extracción con Fallback Resiliente:**
   ```typescript
   let assistantContent = ollamaData?.message?.content || "";
   if (!assistantContent.trim() && ollamaData?.message?.thinking) {
     assistantContent = ollamaData.message.thinking;
   }
   assistantContent = assistantContent.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim();
   ```
3. **Instrucciones Directas de Prompt:** Se refinaron los prompts de visión para instruir al modelo a enumerar directamente platos y precios sin preámbulos discursivos.

---

### 2.4. Tolerancia a Variaciones de Salida de LLMs mediante Zod Preprocessing

#### **Problema Detectado:**
Aunque el prompt solicitaba campos específicos (`name_es`, `dishes`, `price`), los modelos de lenguaje locales a menudo devolvían nombres de clave alternativos:
- `name` o `nombre` en lugar de `name_es`.
- `platos` o `items` en lugar de `dishes`.
- Precios formateados con texto como `"9,50 €"` o `"6.50"` en lugar del tipo numérico flotante `9.5`.

Esto provocaba fallos inmediatos en la validación:
`ZodError: Expected string, received undefined at categories[0].name_es`.

#### **Aprendizaje y Solución:**
En lugar de forzar al LLM a reintentar indefinidamente, se dotó a los schemas de Zod de **tolerancia idiomática inteligente** en [`lib/types.ts`](file:///Users/jonathanquishpe/JoniDev/Nexo/lib/types.ts) mediante `z.preprocess()`:
- Mapea transparentemente `val.name_es || val.name || val.nombre || val.dish_name`.
- Mapea categorías con `val.name_es || val.name || val.categoria || val.category`.
- Convierte automáticamente cadenas como `"9,50 €"` a `9.5` numérico.
- Garantiza que cualquier motor (Gemini, Ollama, LiteRT o Mock) sea aceptado y normalizado sin fricción.

---

### 2.5. Experiencia de Usuario sin Fricción: Autenticación Anónima (Opción A)

#### **Decisión de Diseño:**
En hostelería española, exigir que el hostelero cree una cuenta y verifique su correo antes de ver su carta digitalizada provoca un abandono superior al 70%.

#### **Implementación:**
- **Sesiones Anónimas Supabase (`signInAnonymously`):** Cuando el hostelero digitaliza y pulsa "Publicar Carta", la app crea automáticamente una sesión anónima segura y vincula el restaurante a ese `user_id`.
- **Claiming Opcional de Cuenta:** En el modal de descarga del código QR ([`components/qr/QrDownloadModal.tsx`](file:///Users/jonathanquishpe/JoniDev/Nexo/components/qr/QrDownloadModal.tsx)), se añade un campo sutil para que el usuario pueda introducir su correo y asegurar su carta para gestionarla en el futuro desde cualquier dispositivo sin perder datos.

---

### 2.6. Ciclo de Construcción y Cache Edge ISR

#### **Problema Detectado:**
El script de validación `test:isr` fallaba si se ejecutaba tras haber arrancado `npm run dev`, indicando que faltaban los ficheros estáticos en `.next/server/app/m/`.

#### **Aprendizaje:**
`npm run dev` genera los módulos bajo demanda y reemplaza los artefactos de compilación estática de producción.
Para verificar la revalidación incremental (ISR) y las cabeceras `Cache-Control` (`s-maxage=86400, stale-while-revalidate=604800`), es obligatorio ejecutar `npm run build` previamente.

---

### 2.7. Blindaje de Server Actions en Vercel Serverless (HTTP 413 y Timeouts)

#### **Problema Detectado:**
Al digitalizar cartas fotográficas en el entorno de producción desplegado en Vercel (`https://nexo-q5v7.vercel.app/`), el usuario recibía el error técnico:
`Error: An unexpected response was received from the server.`

#### **Causa Raíz:**
1. **Límite de Payload en Next.js Server Actions (HTTP 413):**  
   Por defecto, Next.js 15 impone un límite estricto de **1 MB** en las Server Actions (`serverActions.bodySizeLimit: '1mb'`). Al enviar 2 o 3 fotografías de cartas codificadas en Data URLs base64 (~500–900 kB cada una tras compresión en Canvas), el `FormData` superaba los 1.5–2.5 MB. El servidor rechazaba la petición con `HTTP 413 Payload Too Large` y rompía el protocolo de streaming RSC, desencadenando el mensaje genérico de error en el cliente.
2. **Timeout de Ejecución Serverless (HTTP 504):**  
   Las funciones serverless de Vercel (Hobby) poseen un timeout por defecto de 15 segundos. Cartas densas procesadas en la nube o a través de reintentos de modelos podían agotar la ventana.

#### **Solución y Blindaje Aplicado (NXE-8):**
1. **Ampliación del Límite de Payload (`next.config.ts`):**  
   Se ajustó la configuración experimental al límite máximo admitido por la infraestructura de Vercel Serverless:
   ```typescript
   experimental: {
     serverActions: {
       bodySizeLimit: "4.5mb",
     },
   },
   ```
2. **Extensión del Timeout a 60 Segundos (`maxDuration`):**  
   Se configuró `export const maxDuration = 60;` tanto en [`app/actions/ai.ts`](file:///Users/jonathanquishpe/JoniDev/Nexo/app/actions/ai.ts) como en [`app/layout.tsx`](file:///Users/jonathanquishpe/JoniDev/Nexo/app/layout.tsx).
3. **Telemetría de Payload y Latencia:**  
   - En [`app/actions/ai.ts`](file:///Users/jonathanquishpe/JoniDev/Nexo/app/actions/ai.ts), se miden y registran el tamaño de los bytes recibidos, el número de imágenes, el motor seleccionado, el número total de platos extraídos y la latencia exacta de ejecución en milisegundos.
   - En [`app/page.tsx`](file:///Users/jonathanquishpe/JoniDev/Nexo/app/page.tsx), se calcula el peso estimado antes del despacho (`~totalMb`), emitiendo advertencia de consola si se superan los 4.2 MB.
4. **Captura Resiliente de Errores en UI:**  
   Si se produce un fallo imprevisto de transporte (`An unexpected response was received from the server`, `Failed to fetch`, `413`), la UI intercepta el mensaje técnico y presenta al hostelero una explicación en español comprensible con activación inmediata del botón de fallback a Mock Demo.

---

## 3. Estado de la Base de Código (Rama `develop`)

### Componentes y Acciones Implementadas:
- [`app/actions/auth.ts`](file:///Users/jonathanquishpe/JoniDev/Nexo/app/actions/auth.ts): Gestión de sesiones anónimas y vinculación de email con `updateUser`.
- [`app/actions/ai.ts`](file:///Users/jonathanquishpe/JoniDev/Nexo/app/actions/ai.ts): Acciones de sondeo de proveedores de IA y digitalización con fallback.
- [`lib/ai/index.ts`](file:///Users/jonathanquishpe/JoniDev/Nexo/lib/ai/index.ts): Orquestador unificado de inferencia (Cloud Gemini, LiteRT Híbrido, LiteRT Simple, Ollama y Mock).
- [`lib/ai/litert_hybrid.ts`](file:///Users/jonathanquishpe/JoniDev/Nexo/lib/ai/litert_hybrid.ts): Pipeline de visión (OCR) y razonamiento (14 alérgenos UE).
- [`scripts/litert-service.ts`](file:///Users/jonathanquishpe/JoniDev/Nexo/scripts/litert-service.ts): Daemon dual local en puertos `:11436` y `:11435`.
- [`components/admin/InferenceControlPanel.tsx`](file:///Users/jonathanquishpe/JoniDev/Nexo/components/admin/InferenceControlPanel.tsx): UI de control de inferencia y configuración de API Keys.
- [`lib/types.ts`](file:///Users/jonathanquishpe/JoniDev/Nexo/lib/types.ts): Schemas Zod auto-normalizadores.

### Historial de Commits Clave en `develop`:
1. `8faa8e1`: *feat(auth): implement anonymous authentication and optional email linking (Option A)*
2. `7354355`: *feat(ai): add inference control panel and robust error handling for local/cloud AI*
3. `1851965`: *feat(litert): add local dual-model service daemon for vision and reasoning*
4. `03dbd7f`: *fix(ai): add thinking token fallback and Zod schema normalization for local LiteRT*

---

## 4. Checklist para la Release a Producción (v1.0.0)

Antes de fusionar `develop` en `main` y desplegar en Vercel + Supabase Producción:

- [ ] **Aprovisionamiento Supabase Producción:**
  - Habilitar el proveedor "Anonymous Sign-Ins" en el panel de Supabase Auth.
  - Ejecutar la migración SQL [`supabase/migrations/20261026000001_initial_schema.sql`](file:///Users/jonathanquishpe/JoniDev/Nexo/supabase/migrations/20261026000001_initial_schema.sql).
  - Configurar las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] **Configuración Gemini Cloud Producción:**
  - Obtener una `GEMINI_API_KEY` válida de Google AI Studio (`AIzaSy...`) y configurarla como secret en el dashboard de Vercel.
- [ ] **Dominio y Vercel Edge:**
  - Configurar el dominio de producción en Vercel.
  - Comprobar que las rutas `/m/[slug]` responden con cabeceras `s-maxage=86400, stale-while-revalidate=604800`.
- [ ] **Aprobación Final:**
  - Fusión de `develop` a `main` y etiquetado (`git tag v1.0.0`).

---

## 5. Flujos Críticos en Foco de Validación (Próximas Sesiones)

Este documento se mantendrá actualizado a medida que ejecutemos y analicemos los siguientes flujos sobre la marcha:

### 1. Persistencia Integral de la Carta
- **Objetivo:** Verificar la inserción y consistencia relacional en Supabase (`restaurants`, `categories`, `dishes`).
- **Puntos a comprobar:**
  - Generación de `slug` único normalizado (ej. `bar-la-esquina`).
  - Correcta asignación de `order_index` en categorías y platos.
  - Almacenamiento íntegro de arrays de alérgenos (`allergens text[]`) y campos bilingües (`_es` / `_en`).
  - Comportamiento ante desconexión o fallo transaccional durante el guardado.

### 2. Flujo de Autenticación y Claiming de Cuenta (Opción A)
- **Objetivo:** Asegurar que la transición de usuario anónimo a propietario registrado sea fluida y segura.
- **Puntos a comprobar:**
  - Creación automática de sesión anónima en `cookies` de Next.js mediante Server Actions.
  - Vinculación de email en el modal de QR (`linkEmailAction`) sin perder la autoría del restaurante.
  - Verificación de políticas RLS: comprobar que un usuario no autenticado o con otro ID no pueda editar ni eliminar la carta.

### 3. Ciclo de Edición y Revalidación de Caché (Edge ISR)
- **Objetivo:** Validar que al modificar un plato o precio en el dashboard, la vista pública del cliente (`/m/[slug]`) se actualice inmediatamente.
- **Puntos a comprobar:**
  - Ejecución de `revalidatePath('/m/[slug]')`.
  - Comportamiento de cabeceras `Cache-Control` (`s-maxage=86400, stale-while-revalidate=604800`) en la Edge Network.

### 4. Experiencia de Usuario y Descarga de Peana A5
- **Objetivo:** Validar la usabilidad de la peana física para el camarero o hostelero.
- **Puntos a comprobar:**
  - Descarga del SVG vectorial del código QR con ratio de contraste >= 21:1.
  - Previsualización e impresión de la plantilla CSS `@media print` en tamaño A5 real con guías de corte y plegado.

