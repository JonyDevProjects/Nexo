# Especificación Técnica: Entorno Local Contenedorizado (Docker), Paridad Supabase y Pipeline CI/CD

> **Documento:** `docs/especificacion_entorno_docker_y_cicd.md`  
> **Ticket Asociado:** `NXE-9`  
> **Autor:** Nexo-DevOps-QA & Nexo-Tech-Lead  
> **Estado:** Aprobado / Implementado  
> **Fecha:** 4 de Noviembre de 2026  

---

## 1. Resumen Ejecutivo y Objetivos

Para iniciar la fase de iteración y escalado de funcionalidades de **Nexo** (SaaS de digitalización de cartas de hostelería en < 3 minutos), se ha establecido una infraestructura de ingeniería local basada en contenedores y automatización continua.

### Metas Cumplidas:
1. **Paridad Total con Producción:** Reproducir localmente el comportamiento de Vercel Serverless (Next.js 15) y Supabase (PostgreSQL 15 con Row Level Security y triggers relacionales) sin depender de servicios cloud externos ni incurrir en costes.
2. **Onboarding Local en 1 Comando:** Cualquier desarrollador puede clonar el repositorio y levantar todo el stack con `npm run docker:up` o `docker compose up -d` en menos de 2 minutos.
3. **Aislamiento de Puertos Host:** Mapeo de PostgreSQL al puerto `54322` para evitar colisiones con bases de datos locales existentes (como PostgreSQL en `5432` o `15432`).
4. **Quality Gate Automatizado (CI/CD):** Pipeline en GitHub Actions (`.github/workflows/ci.yml`) que valida tipos, linting, seguridad RLS (28 checks) y QA de campo (23 checks) en cada Pull Request.

---

## 2. Topografía de Servicios en Docker Compose

El fichero [`docker-compose.yml`](file:///Users/jonathanquishpe/JoniDev/Nexo/docker-compose.yml) orquesta dos servicios principales sobre la red privada `nexo-network`:

```mermaid
flowchart TD
    subgraph Host["Máquina Anfitriona (Desarrollador)"]
        Browser["Navegador / Comensal Mobile\nhttp://localhost:3000"]
        DBClient["Cliente SQL / DBeaver / psql\nlocalhost:54322"]
    end

    subgraph Docker["Docker Compose (Red: nexo-network)"]
        subgraph AppContainer["Contenedor: nexo-app"]
            Next["Next.js 15.5+ Dev Server\n(Node.js 22 LTS)"]
            HotReload["Hot Reload / Live Volume Mount\n(Excluye /app/node_modules)"]
        end

        subgraph DBContainer["Contenedor: nexo-db"]
            PG["PostgreSQL 15 Alpine"]
            AuthShim["Shim de Esquema auth (auth.users, auth.uid())"]
            Schema["Esquema Nexo (restaurants, categories, dishes)"]
            Seed["Datos Demo: Bar Pepe & Tapas"]
        end
    end

    Browser -->|HTTP :3000| Next
    DBClient -->|PostgreSQL :54322| PG
    Next -->|DATABASE_URL db:5432| PG
    HotReload -.-> Next
    AuthShim --> Schema --> Seed
```

### 2.1 Servicio `nexo-app` (Aplicación Web)
* **Imagen Base:** Node.js 22 LTS Alpine (`node:22-alpine`) con optimización de dependencias (`libc6-compat`, `curl`).
* **Multi-stage Dockerfile ([`Dockerfile`](file:///Users/jonathanquishpe/JoniDev/Nexo/Dockerfile)):**
  * `deps`: Cachea e instala dependencias con `npm ci`.
  * `dev`: Objetivo de desarrollo con hot-reloading de Next.js, montando el código fuente local en `/app` y protegiendo `/app/node_modules` para evitar incompatibilidades binarias entre macOS y Linux.
  * `builder`: Compila la versión de producción optimizada (`npm run build`).
  * `runner`: Imagen mínima de producción ejecutada bajo usuario sin privilegios (`nextjs:nodejs`, UID 1001).
* **Puerto:** `3000:3000`.
* **Healthcheck:** Consulta `http://localhost:3000/` con reintentos automáticos.
* **Dependencia:** Condicionada a `db: service_healthy`.

### 2.2 Servicio `nexo-db` (Base de Datos Relacional y RLS)
* **Imagen:** `postgres:15-alpine`.
* **Puerto Expuesto:** `54322:5432` (configurable vía `POSTGRES_PORT` en `.env.local`).
* **Volumen Persistente:** `nexo-pgdata`.
* **Directorio de Inicialización (`docker/init-db/`):**
  * `01-init-supabase-schema.sql`: Implementa el shim del esquema `auth` de Supabase (`auth.users`, función `auth.uid()`, roles `anon`, `authenticated`, `service_role`) y ejecuta la migración DDL completa con las tablas `restaurants`, `categories`, `dishes`, triggers de `updated_at` y las 14 políticas RLS multi-tenant.
  * `02-init-seed.sql`: Carga el usuario demo idempotente `demo-bar-pepe@nexo.internal` (UUID `a0000000-0000-0000-0000-000000000001`) y el restaurante "Bar Pepe & Tapas" con categorías, platos y alérgenos obligatorios de la UE.
* **Healthcheck:** Comando nativo `pg_isready -U postgres -d postgres`.

---

## 3. Manual de Operaciones Local (Runbook)

### 3.1 Comandos Rápidos vía `npm`

| Comando | Acción |
| :--- | :--- |
| `npm run docker:up` | Construye (si es necesario) y levanta los contenedores en segundo plano (`docker compose up -d`). |
| `npm run docker:logs` | Visualiza los logs en tiempo real de la app y la base de datos (`docker compose logs -f`). |
| `npm run docker:down` | Detiene y remueve los contenedores preservando los datos (`docker compose down`). |
| `npm run docker:build` | Reconstruye las imágenes de Docker forzando actualización de capas (`docker compose build`). |
| `npm run test:ci` | Ejecuta la batería completa de calidad local: `typecheck`, `test:rls` y `test:field`. |

### 3.2 Reset Completo de la Base de Datos Local
Para reiniciar la base de datos a su estado virgen con el seed inicial:
```bash
docker compose down -v
docker compose up -d
```

### 3.3 Conexión a la Base de Datos desde el Host
* **Host:** `localhost`
* **Puerto:** `54322`
* **Usuario:** `postgres`
* **Contraseña:** `postgres`
* **Base de datos:** `postgres`
* **URL de Conexión:** `postgres://postgres:postgres@localhost:54322/postgres`

---

## 4. Estrategia de Calidad y Testing Automatizado (QA)

La suite de pruebas de Nexo no requiere mocks frágiles ni conexión a Internet para certificar la integridad del sistema:

### 4.1 Batería de Pruebas Incluida

1. **Chequeo Estricto de Tipos (`npm run typecheck`):**
   * Valida la integridad tipológica del 100% de los componentes React 19, Server Actions de Next.js 15 y esquemas de validación Zod sin generar artefactos de caché huérfanos (`--incremental false`).
2. **Auditoría de Seguridad y RLS (`npm run test:rls`):**
   * 28/28 validaciones automáticas:
     - Integridad estructural de tablas e índices (`slug`, `user_id`, ordenación).
     - Políticas RLS para lectura pública de cartas publicadas y bloqueo estricto de edición entre inquilinos (0% data leakage).
     - Validación de eliminación en cascada (`ON DELETE CASCADE`).
3. **Simulador de Campo y Experiencia de Usuario (`npm run test:field`):**
   * 23/23 validaciones automáticas:
     - Cumplimiento de la plantilla física de peana A5 (ISO 216) y directiva UE 1169/2011.
     - Contraste óptico del código QR (ratio 21:1, nivel de corrección de error H).
     - Time-To-Value (TTV) < 180 segundos (media empírica: 53.0 segundos con tasa de corrección < 2.8%).
     - Accesibilidad móvil: filtro reactivo de alérgenos y selector de idioma instantáneo.

---

## 5. Pipeline de CI/CD (GitHub Actions)

El archivo [`.github/workflows/ci.yml`](file:///Users/jonathanquishpe/JoniDev/Nexo/.github/workflows/ci.yml) protege las ramas `develop`, `test` y `main`:

```mermaid
flowchart LR
    PushPR["Git Push / Pull Request\n(main, develop, test)"]
    
    subgraph Job1["Job: quality-gate"]
        NPM["npm ci"] --> Typecheck["TypeScript Strict\n(npm run typecheck)"]
        Typecheck --> Lint["ESLint Audit\n(npm run lint)"]
        Lint --> RLS["RLS Security Suite\n(npm run test:rls - 28 checks)"]
        RLS --> Field["QA de Campo & TTV\n(npm run test:field - 23 checks)"]
    end

    subgraph Job2["Job: docker-validation"]
        ComposeCheck["docker compose config"] --> BuildDev["Build Target: dev"]
        BuildDev --> BuildProd["Build Target: runner (Prod)"]
    end

    PushPR --> Job1
    PushPR --> Job2
```

### Reglas de Promoción:
* Ningún cambio puede ser mergeado a `develop` sin que ambos jobs (`quality-gate` y `docker-validation`) reporten estado verde.
* Las promociones a `main` despliegan automáticamente en Vercel una vez verificada la paridad por el pipeline.
