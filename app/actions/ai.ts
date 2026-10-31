"use server";

import { extractMenu, ImageInput } from "@/lib/ai";
import { ExtractedMenu } from "@/lib/types";

export interface ExtractMenuActionResult {
  success: boolean;
  data?: ExtractedMenu;
  provider?: "local" | "litert" | "gemini" | "mock";
  modelName?: string;
  error?: string;
}

export async function extractMenuAction(
  formData: FormData
): Promise<ExtractMenuActionResult> {
  try {
    const images: ImageInput[] = [];
    const entries = formData.getAll("images");

    for (const entry of entries) {
      if (typeof entry === "string") {
        // base64 data url
        const matches = entry.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (matches) {
          images.push({
            mimeType: matches[1],
            base64Data: matches[2],
          });
        }
      } else if (entry instanceof File) {
        const buffer = await entry.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        images.push({
          mimeType: entry.type || "image/jpeg",
          base64Data: base64,
        });
      }
    }

    if (images.length === 0) {
      return {
        success: false,
        error: "Debes subir al menos una fotografía de la carta.",
      };
    }

    if (images.length > 4) {
      return {
        success: false,
        error: "El límite es de hasta 4 imágenes por escaneo.",
      };
    }

    const result = await extractMenu(images);

    return {
      success: true,
      data: result.data,
      provider: result.provider,
      modelName: result.modelName,
    };
  } catch (error: any) {
    console.error("Error en extractMenuAction:", error);
    return {
      success: false,
      error: error.message || "Error al procesar la imagen con el motor de IA.",
    };
  }
}
