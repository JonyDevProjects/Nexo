# Nexo ⚡

> **Tu restaurante en internet en 3 minutos con una foto.**  
> Micro-SaaS para bares y restaurantes pequeños con ingesta multimodal (IA Local / Gemini Flash), detección automática de los 14 alérgenos de la UE, multiidioma y código QR listo para imprimir en mesa.

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias y arrancar
```bash
npm install
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 2. Rutas Principales
* `/` $\rightarrow$ Onboarding y digitalizador de cartas con IA.
* `/m/bar-pepe` $\rightarrow$ Carta pública interactiva demo con filtro de alérgenos y selector multiidioma.

---

## 🤖 Motor de IA Híbrido (Local First + Cloud)

Nexo soporta tanto inferencia en local con modelos de visión de **Ollama** como en la nube con **Google Gemini Flash**:

* **IA en Local (Ollama):** Conecta directamente con tu daemon local (`http://127.0.0.1:11434`) usando modelos como `qwen3-vl:8B` o `openbmb/minicpm-v4.7:latest`.
* **IA en Cloud (Gemini):** Añade tu `GEMINI_API_KEY` en `.env.local` para máxima velocidad (~2,2s).
* **Modo Demo:** Si no hay motor configurado, funciona automáticamente con datos de prueba realistas.

Configuración en `.env.local`:
```bash
AI_PROVIDER=auto # 'auto' | 'local' | 'gemini' | 'mock'
OLLAMA_MODEL=qwen3-vl:8B
GEMINI_API_KEY=tu-clave-gemini
```

---

## 📚 Documentación del Proyecto (`/docs`)

* 🗺️ [**Roadmap Detallado**](file:///Users/jonathanquishpe/JoniDev/Nexo/docs/roadmap_detallado.md)
* 💻 [**Guía de Ingesta IA Local (Ollama & LLM_Local_Setup)**](file:///Users/jonathanquishpe/JoniDev/Nexo/docs/ingesta_ia_local_setup.md)
* 📋 [**Fase 1: Objetivos y Requisitos del MVP**](file:///Users/jonathanquishpe/JoniDev/Nexo/docs/fase1_objetivos_y_requisitos_mvp.md)
* 📐 [**Fase 1: Planificación y Backlog**](file:///Users/jonathanquishpe/JoniDev/Nexo/docs/fase1_planificacion_mvp.md)
* 💰 [**Estimación Económica de Ingesta IA**](file:///Users/jonathanquishpe/JoniDev/Nexo/docs/estimacion_ingesta_ia_gemini.md)
* ⚙️ [**Fase 2: Análisis y Especificación Técnica (SQL DDL y RLS)**](file:///Users/jonathanquishpe/JoniDev/Nexo/docs/fase2_analisis_especificacion_tecnica.md)
* 🎨 [**Fase 3: Diseño UI/UX y Prototipado**](file:///Users/jonathanquishpe/JoniDev/Nexo/docs/fase3_diseno_ui_ux.md)
* 🔨 [**Fase 4: Construcción y Despliegue**](file:///Users/jonathanquishpe/JoniDev/Nexo/docs/fase4_construccion_mvp.md)
* 💡 [**Informe Original de la Idea**](file:///Users/jonathanquishpe/JoniDev/Nexo/docs/Idea.md)
