"use server";

import { revalidateTag, revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ExtractedMenu } from "@/lib/types";

export interface SaveMenuPayload {
  restaurantName: string;
  slug: string;
  description?: string;
  menu: ExtractedMenu;
  legalConfirmed: boolean;
}

export async function saveMenuAction(
  payload: SaveMenuPayload
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    if (!payload.legalConfirmed) {
      return {
        success: false,
        error: "Debes confirmar y certificar la información de alérgenos antes de publicar.",
      };
    }

    if (!payload.slug || payload.slug.trim().length < 2) {
      return {
        success: false,
        error: "El slug del restaurante debe tener al menos 2 caracteres.",
      };
    }

    const cleanSlug = payload.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes("dummy");

    if (isSupabaseConfigured) {
      const supabase = await createServerSupabaseClient();
      let {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Garantizar sesión anónima transparente (Onboarding < 3 min sin fricción)
        const { data: anonData, error: anonError } =
          await supabase.auth.signInAnonymously();

        if (anonError || !anonData.user) {
          console.error("Error al iniciar sesión anónima en saveMenuAction:", anonError);
          return {
            success: false,
            error: "No se pudo iniciar una sesión segura para publicar tu carta.",
          };
        }
        user = anonData.user;
      }

      const userId = user.id;

      // 1. Upsert Restaurant
      const { data: restaurant, error: resError } = await supabase
        .from("restaurants")
        .upsert(
          {
            user_id: userId,
            name: payload.restaurantName,
            slug: cleanSlug,
            description: payload.description || null,
            is_published: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "slug" }
        )
        .select()
        .single();

      if (resError || !restaurant) {
        throw new Error(resError?.message || "Error al guardar el restaurante.");
      }

      // 2. Clear old categories and dishes
      await supabase.from("categories").delete().eq("restaurant_id", restaurant.id);

      // 3. Insert new categories & dishes
      for (let i = 0; i < payload.menu.categories.length; i++) {
        const cat = payload.menu.categories[i];

        const { data: insertedCategory, error: catError } = await supabase
          .from("categories")
          .insert({
            restaurant_id: restaurant.id,
            name_es: cat.name_es,
            name_en: cat.name_en || null,
            order_index: i,
          })
          .select()
          .single();

        if (catError || !insertedCategory) {
          throw new Error(catError?.message || "Error al guardar categorías.");
        }

        if (cat.dishes && cat.dishes.length > 0) {
          const dishesToInsert = cat.dishes.map((dish, dIndex) => ({
            restaurant_id: restaurant.id,
            category_id: insertedCategory.id,
            name_es: dish.name_es,
            name_en: dish.name_en || null,
            description_es: dish.description_es || null,
            description_en: dish.description_en || null,
            price: dish.price,
            allergens: dish.allergens || [],
            is_available: true,
            order_index: dIndex,
          }));

          const { error: dishError } = await supabase
            .from("dishes")
            .insert(dishesToInsert);

          if (dishError) {
            throw new Error(dishError.message || "Error al insertar platos.");
          }
        }
      }
    }

    // Invalidate edge cache tag and page route for this restaurant
    try {
      revalidateTag(`menu-${cleanSlug}`);
      revalidatePath(`/m/${cleanSlug}`);
    } catch {
      // ignore in test/dev
    }

    return {
      success: true,
      url: `/m/${cleanSlug}`,
    };
  } catch (error: any) {
    console.error("Error en saveMenuAction:", error);
    return {
      success: false,
      error: error.message || "Ocurrió un error al guardar y publicar la carta.",
    };
  }
}
