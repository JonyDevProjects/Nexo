"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AuthActionResult {
  success: boolean;
  userId?: string;
  isAnonymous?: boolean;
  error?: string;
}

/**
 * Garantiza de forma transparente una sesión anónima en Supabase Auth.
 * Si el usuario ya cuenta con sesión (anónima o autenticada), la devuelve.
 * Si no cuenta con sesión, crea un usuario anónimo (is_anonymous: true)
 * sin interrumpir el flujo del hostelero (< 3 minutos onboarding).
 */
export async function ensureAnonymousSessionAction(): Promise<AuthActionResult> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes("dummy");

    if (!isSupabaseConfigured) {
      // Modo demo/offline
      return {
        success: true,
        userId: "demo-anonymous-user",
        isAnonymous: true,
      };
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return {
        success: true,
        userId: user.id,
        isAnonymous: user.is_anonymous || false,
      };
    }

    // Crear sesión anónima
    const { data: anonData, error: anonError } =
      await supabase.auth.signInAnonymously();

    if (anonError || !anonData.user) {
      console.error("Error en signInAnonymously:", anonError);
      return {
        success: false,
        error: anonError?.message || "No se pudo iniciar la sesión anónima.",
      };
    }

    return {
      success: true,
      userId: anonData.user.id,
      isAnonymous: true,
    };
  } catch (error: any) {
    console.error("Error en ensureAnonymousSessionAction:", error);
    return {
      success: false,
      error: error.message || "Error al autenticar sesión.",
    };
  }
}

/**
 * Vincula un correo electrónico a la sesión del hostelero (actualiza el usuario anónimo).
 * Supabase envía un enlace/código de confirmación para que el hostelero pueda
 * volver a entrar a editar su carta en cualquier momento desde cualquier dispositivo.
 */
export async function linkEmailAction(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return {
        success: false,
        error: "Por favor, introduce una dirección de correo electrónico válida.",
      };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes("dummy");

    if (!isSupabaseConfigured) {
      // Modo demo
      return { success: true };
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "No hay una sesión activa para vincular. Por favor, recarga la página.",
      };
    }

    const { error } = await supabase.auth.updateUser({
      email: cleanEmail,
    });

    if (error) {
      console.error("Error en supabase.auth.updateUser:", error);
      return {
        success: false,
        error:
          error.message ||
          "No se pudo enviar el enlace de verificación. Inténtalo de nuevo.",
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error en linkEmailAction:", error);
    return {
      success: false,
      error: error.message || "Ocurrió un error al vincular el correo.",
    };
  }
}
