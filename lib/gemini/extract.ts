import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MENU_EXTRACTION_SYSTEM_PROMPT, GEMINI_RESPONSE_SCHEMA } from "./prompt";
import { ExtractedMenu, ExtractedMenuSchema } from "../types";

export interface ImageInput {
  base64Data: string;
  mimeType: string;
}

export async function extractMenuFromImages(
  images: ImageInput[],
  apiKeyOverride?: string
): Promise<ExtractedMenu> {
  const apiKey = (apiKeyOverride || process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey || apiKey === "your-gemini-api-key") {
    console.warn("GEMINI_API_KEY no configurada. Usando respuesta simulada para pruebas de desarrollo.");
    return getMockExtractedMenu();
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Using gemini-1.5-flash or gemini-2.0-flash
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        // @ts-expect-error responseSchema is supported in Gemini 1.5+
        responseSchema: GEMINI_RESPONSE_SCHEMA,
        temperature: 0.2,
      },
      systemInstruction: GEMINI_MENU_EXTRACTION_SYSTEM_PROMPT,
    });

    const imageParts = images.map((img) => ({
      inlineData: {
        data: img.base64Data.replace(/^data:image\/[a-z]+;base64,/, ""),
        mimeType: img.mimeType,
      },
    }));

    const prompt = "Analiza y extrae minuciosamente todos los platos, categorías, precios en euros y alérgenos de la UE de esta carta:";

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();

    try {
      const parsedJson = JSON.parse(responseText);
      const validated = ExtractedMenuSchema.parse(parsedJson);
      return validated;
    } catch (error) {
      console.error("Error al parsear respuesta JSON de Gemini:", error, responseText);
      throw new Error("No se pudo extraer la carta en un formato válido. Por favor, reintenta con una foto más nítida.");
    }
  } catch (error: any) {
    console.error("Error en llamada a Gemini:", error);
    const msg = error.message || String(error);
    if (
      msg.includes("401") ||
      msg.includes("API key not valid") ||
      msg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")
    ) {
      throw new Error(
        "Clave de API de Gemini no válida o sin permisos (Error 401). Verifica tu GEMINI_API_KEY en Google AI Studio (debe empezar por 'AIzaSy...') o selecciona otro motor en 'Configurar' (Local Ollama o Simulación Demo)."
      );
    }
    if (
      msg.includes("429") ||
      msg.includes("quota") ||
      msg.includes("ResourceExhausted")
    ) {
      throw new Error(
        "Se ha superado la cuota de la API de Gemini (Error 429). Puedes usar 'Simulación Demo' o un motor local para continuar probando."
      );
    }
    throw error;
  }
}

export function getMockExtractedMenu(): ExtractedMenu {
  return {
    categories: [
      {
        name_es: "Tapas y Raciones",
        name_en: "Tapas and Portions",
        dishes: [
          {
            name_es: "Croquetas Caseras de Jamón Ibérico (6 uds)",
            name_en: "Homemade Iberian Ham Croquettes (6 pcs)",
            description_es: "Bechamel cremosa tradicional con taquitos de jamón de bellota",
            description_en: "Traditional creamy bechamel with acorn-fed Iberian ham cubes",
            price: 9.5,
            allergens: ["gluten", "dairy", "eggs"],
          },
          {
            name_es: "Patatas Bravas de la Casa",
            name_en: "House Special Spicy Potatoes (Bravas)",
            description_es: "Patatas crujientes con salsa brava artesanal ligeramente picante y alioli suave",
            description_en: "Crispy potatoes served with homemade spicy brava sauce and garlic alioli",
            price: 6.0,
            allergens: ["gluten", "eggs"],
          },
          {
            name_es: "Calamares a la Andaluza",
            name_en: "Andalusian-Style Fried Squid",
            description_es: "Anillas de calamar fresco enharinadas y fritas en aceite de oliva con limón",
            description_en: "Fresh squid rings lightly floured and fried in olive oil, served with lemon",
            price: 11.5,
            allergens: ["gluten", "molluscs"],
          },
        ],
      },
      {
        name_es: "Carnes y Hamburguesas",
        name_en: "Meats and Burgers",
        dishes: [
          {
            name_es: "Smash Burger Clásica",
            name_en: "Classic Smash Burger",
            description_es: "Doble carne de ternera madurada (180g), queso cheddar fundido, pepinillos y salsa burger",
            description_en: "Double aged beef patty, melted cheddar cheese, pickles and signature burger sauce",
            price: 10.9,
            allergens: ["gluten", "dairy", "eggs", "mustard", "sesame"],
          },
          {
            name_es: "Secreto Ibérico a la Brasa",
            name_en: "Grilled Iberian Pork Secret",
            description_es: "Pieza tierna de cerdo ibérico con escamas de sal maldon y patatas panaderas",
            description_en: "Tender cut of Iberian pork grilled with maldon salt flakes and baked potatoes",
            price: 14.5,
            allergens: [],
          },
        ],
      },
      {
        name_es: "Postres y Bebidas",
        name_en: "Desserts and Drinks",
        dishes: [
          {
            name_es: "Tarta de Queso Fluida al Horno",
            name_en: "Baked Creamy Cheesecake",
            description_es: "Tarta de queso estilo Donostia con corazón cremoso",
            description_en: "San Sebastian style cheesecake with a melted creamy heart",
            price: 5.5,
            allergens: ["dairy", "eggs", "gluten"],
          },
          {
            name_es: "Caña de Cerveza de Barril",
            name_en: "Draft Beer",
            description_es: "Cerveza rubia bien fría tirada al momento",
            description_en: "Cold draft lager beer",
            price: 2.2,
            allergens: ["gluten"],
          },
        ],
      },
    ],
  };
}
