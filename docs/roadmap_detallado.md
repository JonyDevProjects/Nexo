# Roadmap Detallado: Nexo MVP y Validación

> **Proyecto:** Nexo  
> **Estado:** MVP Construido (Fase 4 Completada)  
> **Fase Actual:** Validación, Pruebas de Ingesta IA y Despliegue

---

## 1. Visión General del Roadmap

```mermaid
flowchart TD
    subgraph "Fase 1: Pruebas Funcionales de Ingesta IA"
        A1["1.1 Ingesta Local con Ollama<br>(Qwen3-VL:8B / MiniCPM-V 4.7)"] --> A2["1.2 Ingesta Cloud con Gemini Flash<br>(Google AI Studio)"]
        A2 --> A3["1.3 Benchmark Comparativo<br>(Precisión alérgenos, latencia, consumo)"]
    end

    subgraph "Fase 2: Persistencia y Backend"
        B1["2.1 Ejecutar DDL en Supabase"] --> B2["2.2 Configurar RLS y Auth"]
        B2 --> B3["2.3 Pruebas de Mutación y Revalidación ISR"]
    end

    subgraph "Fase 3: Despliegue en Producción (Free Tier)"
        C1["3.1 Subir a GitHub"] --> C2["3.2 Despliegue en Vercel Edge"]
        C2 --> C3["3.3 Configuración de Variables de Entorno"]
    end

    subgraph "Fase 4: Validación Piloto en Mesa (Campo)"
        D1["4.1 Impresión de Peanas/PDF en Local Real"] --> D2["4.2 Escaneo por Comensales y Hosteleros"]
        D2 --> D3["4.3 Feedback de Usabilidad y Tiempos"]
    end

    subgraph "Fase 5: Post-MVP (Plan Pro)"
        E1["5.1 Formato Menú Visual Reels/TikTok"] --> E2["5.2 Optimización de Video Hosting"]
    end

    A3 --> B1
    B3 --> C1
    C3 --> D1
    D3 --> E1
```

---

## 2. Desglose Detallado de Hitos

### Hito 1: Ingesta IA en Local (Ollama) vs Cloud (Gemini)
* **Objetivo:** Probar el pipeline de visión de forma 100% privada y offline antes de conectar APIs externas.
* **Modelos Locales Evaluados (del setup de `LLM_Local_Setup`):**
  * `qwen3-vl:8B`: Modelo ligero (6,1 GB), excelente capacidad de OCR y visión tabular, respuesta ágil en Apple Silicon M1 Pro.
  * `openbmb/minicpm-v4.7:latest`: Modelo multimodal avanzado (22 GB), diseñado específicamente para lectura de documentos complejos.
* **Criterios de Aceptación:**
  * Endpoint local en `http://127.0.0.1:11434/api/chat` devuelve JSON estructurado según el schema.
  * Selector en `.env.local` (`AI_PROVIDER=local` vs `AI_PROVIDER=gemini`).
  * Precisión de alérgenos UE evaluada con al menos 3 fotos de cartas reales.

### Hito 2: Configuración de Base de Datos (Supabase)
* **Objetivo:** Pasar del modo demostración a persistencia multi-tenant real en PostgreSQL.
* **Entregables:**
  * Tablas `restaurants`, `categories`, `dishes` creadas mediante el script DDL.
  * Políticas de Row Level Security (RLS) verificadas: Comensales solo lectura pública, dueño solo escritura de sus platos.
  * Activación de revalidación atómica de tags ISR (`menu-[slug]`).

### Hito 3: Despliegue en Vercel (Producción 0 €)
* **Objetivo:** Tener la aplicación en vivo con SSL y subdominio público en internet.
* **Entregables:**
  * Repositorio conectado a Vercel CI/CD.
  * Variables de entorno de producción inyectadas (`NEXT_PUBLIC_SUPABASE_URL`, etc.).
  * Verificación de First Load JS < 150 kB y tiempo de respuesta < 500 ms en móvil.

### Hito 4: Prueba Piloto con Establecimiento Real
* **Objetivo:** Validar la propuesta de valor *"Tu restaurante en internet en 3 minutos"*.
* **Métricas a Medir:**
  * Tiempo total desde la foto hasta el QR impreso en mesa.
  * Tasa de correcciones necesarias en el editor táctil (< 10%).
  * Comprensión comensal de la barra de alérgenos sin asistencia.

### Hito 5: Fase 2 (Post-MVP - Menú Reels/TikTok)
* **Objetivo:** Añadir soporte de vídeo vertical corto para platos destacados en el Plan Pro (5 €/mes).
