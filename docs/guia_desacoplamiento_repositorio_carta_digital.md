# GUÍA DE DESACOPLAMIENTO: REPOSITORIO INDEPENDIENTE DE LA CARTA DIGITAL (`nexo-menu`)
**Procedimiento Operativo Estándar (SOP) para la Separación del Producto Carta Digital**  
*Fecha: Noviembre 2026 | Versión: 1.0.0 | Autor: Equipo de Arquitectura Nexo*

---

## 1. Objetivo

Esta guía establece los pasos técnicos necesarios para migrar la aplicación de la **Carta Digital** (actualmente desarrollada dentro del repositorio `Nexo`) a su propio **repositorio independiente en GitHub** (`https://github.com/JonyDevProjects/nexo-menu.git`).

Tras esta migración:
1. **`nexo-menu`** será el repositorio autónomo del producto, donde el **Product Owner (`nexo-po-menu`)** y los desarrolladores gestionarán las versiones, dependencias y despliegues de la carta.
2. **`Nexo`** quedará consolidado como el **Hub Central de Gobernanza y Operaciones**, gestionando la flota de agentes, los catálogos de proyectos, los templates reutilizables y las directrices globales.

---

## 2. Pasos para la Creación del Repositorio Satélite `nexo-menu`

### Paso 1: Crear el Repositorio en GitHub
1. Acceder a la organización o cuenta de GitHub: `JonyDevProjects`.
2. Crear un nuevo repositorio llamado: **`nexo-menu`**.
   - Visibilidad: Privado (o público según políticas de producto).
   - Descripción: *"Nexo Menu — Digital QR Menu with AI Ingestion, Allergen Intelligence & Tabletop Stand"*.
   - Inicializar **vacío** (sin README, ni .gitignore inicial).

---

### Paso 2: Exportar el Código del Producto al Nuevo Repositorio
Desde la máquina local del desarrollador o del hub:

```bash
# 1. Crear un directorio de trabajo para el producto satélite
cd /Users/jonathanquishpe/JoniDev
mkdir -p nexo-menu && cd nexo-menu

# 2. Inicializar git
git init
git branch -M main

# 3. Copiar los archivos del producto de la carta desde el proyecto base
# (O alternativamente, clonar y configurar el nuevo origen remoto)
# Archivos clave a incluir en nexo-menu:
# - app/
# - components/
# - lib/
# - public/
# - scripts/
# - Dockerfile, docker-compose.yml
# - package.json, tsconfig.json, tailwind.config.ts, next.config.ts
# - .env.example

# 4. Vincular con el nuevo repositorio remoto en GitHub
git remote add origin https://github.com/JonyDevProjects/nexo-menu.git

# 5. Crear la rama de integración 'develop' (GitFlow)
git checkout -b develop

# 6. Commit inicial y push
git add .
git commit -m "chore: initial commit of nexo-menu standalone product repository"
git push -u origin develop
git checkout main
git merge develop
git push -u origin main
git checkout develop
```

---

### Paso 3: Configurar Secretos y Despliegue en Vercel
1. En el dashboard de **Vercel**:
   - Crear un nuevo proyecto importando el repositorio `JonyDevProjects/nexo-menu`.
   - Framework preset: `Next.js`.
   - Configurar variables de entorno de producción:
     - `NEXT_PUBLIC_APP_URL`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `GEMINI_API_KEY`
     - `AI_PROVIDER=gemini`

---

### Paso 4: Configuración de CI/CD en GitHub Actions
El nuevo repositorio `nexo-menu` heredará el workflow corporativo de testing continuo en `.github/workflows/ci.yml`:
- En cada Pull Request a `develop` o `main`:
  1. `npm ci`
  2. `npm run typecheck`
  3. `npm run test:ci` (Validación de RLS, contratos de campo y persistencia de menú).

---

## 3. Asignación del Product Owner al Producto

Una vez creado el repositorio satélite:
1. El **Product Owner (`nexo-po-menu`)** asume la responsabilidad del backlog en `nexo-menu`.
2. Las tareas, issues e hitos de la Carta Digital se crearán en los **GitHub Issues / Projects** del repositorio `nexo-menu`.
3. Cualquier consulta del cliente respecto a hostelería, cartas o nuevas funciones se canaliza exclusivamente a través de `nexo-po-menu`.

---

## 4. Estructura Final del Repositorio Hub (`Nexo`)

El repositorio actual `Nexo` conservará y reforzará su rol de **Centro de Mando Corporativo**:
- `products/catalog.json`: Catálogo vivo de todos los productos y sus POs asignados.
- `hive/`: Flota de agentes Munder Difflin / Hive para orquestar la factoría.
- `docs/`: Arquitectura general, estándares de ingeniería, directrices de consultoría y acuerdos de nivel de servicio (SLAs).
- `templates/`: Plantillas base para que nuevos productos se levanten en cuestión de minutos.
