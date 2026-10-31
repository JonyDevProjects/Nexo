"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ImageUploader, CompressedImage } from "@/components/admin/ImageUploader";
import { AiProgressStepper } from "@/components/admin/AiProgressStepper";
import { MenuEditor } from "@/components/admin/MenuEditor";
import { QrDownloadModal } from "@/components/qr/QrDownloadModal";
import { extractMenuAction } from "@/app/actions/ai";
import { saveMenuAction } from "@/app/actions/menu";
import { ensureAnonymousSessionAction } from "@/app/actions/auth";
import { ExtractedMenu } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Sparkles, Utensils, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";

export default function HomePage() {
  const [selectedImages, setSelectedImages] = useState<CompressedImage[]>([]);
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [extractedMenu, setExtractedMenu] = useState<ExtractedMenu | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [savedRestaurantName, setSavedRestaurantName] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<"local" | "litert" | "gemini" | "mock">("local");
  const [aiModelName, setAiModelName] = useState<string>("");

  useEffect(() => {
    // Garantiza sesión anónima transparente en segundo plano
    ensureAnonymousSessionAction().catch((err) => {
      console.warn("Sesión anónima:", err);
    });
  }, []);

  const handleProcessAi = async () => {
    if (selectedImages.length === 0) return;
    setErrorMsg(null);
    setIsProcessingAi(true);

    try {
      const formData = new FormData();
      selectedImages.forEach((img) => {
        formData.append("images", img.dataUrl);
      });

      const res = await extractMenuAction(formData);

      if (!res.success || !res.data) {
        throw new Error(res.error || "Error al procesar la carta con IA.");
      }

      if (res.provider) setAiProvider(res.provider);
      if (res.modelName) setAiModelName(res.modelName);
      setExtractedMenu(res.data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al conectar con el servicio de IA.");
    } finally {
      setIsProcessingAi(false);
    }
  };

  const handleSaveMenu = async (payload: {
    restaurantName: string;
    slug: string;
    description: string;
    menu: ExtractedMenu;
    legalConfirmed: boolean;
  }) => {
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await saveMenuAction({
        restaurantName: payload.restaurantName,
        slug: payload.slug,
        description: payload.description,
        menu: payload.menu,
        legalConfirmed: payload.legalConfirmed,
      });

      if (!res.success) {
        throw new Error(res.error || "Error al publicar la carta.");
      }

      setSavedSlug(payload.slug);
      setSavedRestaurantName(payload.restaurantName);
      setIsModalOpen(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-zinc-950">
      {/* Barra superior */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black shadow-sm">
              <Utensils className="w-4 h-4" />
            </div>
            <span className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              Nexo
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Plan Free
            </span>
          </div>

          <Link
            href="/m/bar-pepe"
            target="_blank"
            className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-amber-600 flex items-center gap-1 transition-colors"
          >
            <span>Ver Carta Demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="max-w-xl mx-auto px-4 py-8 space-y-8">
        {!extractedMenu ? (
          <>
            {/* Hero */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Tu restaurante en internet en 3 minutos</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                De foto en papel a{" "}
                <span className="text-amber-600 dark:text-amber-500">
                  Carta QR con Alérgenos
                </span>
              </h1>

              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
                Sube una foto de tu carta o pizarra. Nuestra IA extrae platos,
                precios, detecta los 14 alérgenos de la UE y traduce al inglés automáticamente.
              </p>
            </div>

            {/* Ventajas clave */}
            <div className="grid grid-cols-3 gap-2 py-1 text-center">
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
                <span className="text-xl">📸</span>
                <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">Foto a Menú</p>
                <p className="text-[10px] text-zinc-400">Sin teclear nada</p>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
                <span className="text-xl">🌾</span>
                <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">14 Alérgenos</p>
                <p className="text-[10px] text-zinc-400">Normativa UE</p>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
                <span className="text-xl">🇬🇧</span>
                <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">Traducción</p>
                <p className="text-[10px] text-zinc-400">Para turistas</p>
              </div>
            </div>

            {/* Componente de Subida */}
            <div className="space-y-4">
              <ImageUploader
                onImagesReady={(imgs) => setSelectedImages(imgs)}
                isLoading={isProcessingAi}
              />

              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-xs border border-red-200">
                  {errorMsg}
                </div>
              )}

              {selectedImages.length > 0 && !isProcessingAi && (
                <Button
                  onClick={handleProcessAi}
                  size="lg"
                  className="w-full text-base py-4"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Digitalizar Carta con Gemini Flash ({selectedImages.length} foto
                  {selectedImages.length > 1 ? "s" : ""})
                </Button>
              )}

              <AiProgressStepper isProcessing={isProcessingAi} />
            </div>

            {/* Acceso Directo de Prueba */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-center space-y-2">
              <p className="text-xs text-zinc-500">¿Quieres ver cómo queda una carta terminada?</p>
              <Link
                href="/m/bar-pepe"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                <span>Explorar la carta pública de &quot;Bar Pepe&quot;</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </>
        ) : (
          /* Editor Táctil de Platos */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setExtractedMenu(null)}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-semibold flex items-center gap-1"
              >
                ← Subir otras fotos
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-xs border border-red-200">
                {errorMsg}
              </div>
            )}

            <MenuEditor
              initialMenu={extractedMenu}
              onSave={handleSaveMenu}
              isSaving={isSaving}
              provider={aiProvider}
              modelName={aiModelName}
            />
          </div>
        )}
      </main>

      {/* Modal de Descarga de QR e Impresión */}
      <QrDownloadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        restaurantName={savedRestaurantName}
        slug={savedSlug || "mi-bar"}
      />
    </div>
  );
}
