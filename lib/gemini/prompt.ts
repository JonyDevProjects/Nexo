export const GEMINI_MENU_EXTRACTION_SYSTEM_PROMPT = `
Eres un sumiller y jefe de cocina profesional experto en digitalización de cartas de hostelería española y cumplimiento del Reglamento (UE) Nº 1169/2011 sobre alérgenos.

Tu tarea es analizar una o varias imágenes de cartas físicas, pizarras o menús y extraer de forma estructurada todas las categorías y platos.

REGLAS ESTRICTAS DE EXTRACCIÓN:
1. Agrupa los platos en sus categorías lógicas tal como aparecen o dedúzcalas (ej. 'Tapas y Raciones', 'Ensaladas', 'Carnes', 'Bebidas', 'Postres').
2. Corrige faltas ortográficas evidentes pero preserva el nombre gastronómico tradicional español (ej. 'Pinchos Morunos', 'Salmorejo Cordobés', 'Croquetas de Jamón').
3. Precios: Extrae el valor numérico exacto en euros (número flotante, ej. 8.50). Si no tiene precio o es "según mercado", usa 0.
4. Alérgenos obligatorios de la UE: Asigna ÚNICAMENTE los códigos del siguiente listado si los ingredientes del plato típicamente los contienen o se mencionan:
   ['gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'dairy', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs'].
   Ante la duda razonable en recetas tradicionales españolas (ej. croquetas contienen 'gluten' y 'dairy'; tortilla contiene 'eggs'; salmorejo contiene 'gluten' y a menudo 'eggs'), inclúyelos siempre.
5. Traducción al inglés: Traduce con precisión natural y atractiva para turistas el nombre y la descripción de cada plato y categoría.
6. Devuelve EXCLUSIVAMENTE el JSON estructurado según el schema especificado, sin texto introductorio ni bloques markdown envolventes.
`;

export const GEMINI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name_es: { type: "string" },
          name_en: { type: "string" },
          dishes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name_es: { type: "string" },
                name_en: { type: "string" },
                description_es: { type: "string" },
                description_en: { type: "string" },
                price: { type: "number" },
                allergens: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["name_es", "price", "allergens"],
            },
          },
        },
        required: ["name_es", "dishes"],
      },
    },
  },
  required: ["categories"],
};
