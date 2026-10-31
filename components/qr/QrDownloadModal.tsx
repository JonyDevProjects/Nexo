"use client";

import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { Download, Printer, X, ExternalLink, Check } from "lucide-react";

interface QrDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  slug: string;
}

export const QrDownloadModal: React.FC<QrDownloadModalProps> = ({
  isOpen,
  onClose,
  restaurantName,
  slug,
}) => {
  const qrRef = useRef<SVGSVGElement>(null);

  if (!isOpen) return null;

  const appUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/m/${slug}`
      : `https://nexo-menu.vercel.app/m/${slug}`;

  const downloadPNG = () => {
    const svg = qrRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = 1024;
    canvas.height = 1024;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `QR-${slug}.png`;
        a.click();
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Check className="w-4 h-4" /> ¡Carta Publicada con Éxito!
            </span>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Código QR y Material de Mesa
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enlace directo a la carta */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between gap-2">
          <div className="truncate text-xs text-zinc-600 dark:text-zinc-300">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">Enlace de tu carta:</span>
            <span className="font-mono text-amber-600 dark:text-amber-400 truncate">{appUrl}</span>
          </div>
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-xs font-semibold text-zinc-800 dark:text-zinc-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ver Carta</span>
          </a>
        </div>

        {/* Plantilla A5 Imprimible / Peana de mesa */}
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 bg-white dark:bg-zinc-950 text-center space-y-4 shadow-sm print:m-0 print:border-none print:shadow-none">
          <div className="space-y-1">
            <h4 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-50">
              {restaurantName}
            </h4>
            <p className="text-xs text-zinc-500 font-medium">
              Escanea con tu cámara móvil para ver la carta y alérgenos
            </p>
          </div>

          <div className="flex justify-center p-3 bg-white rounded-2xl w-fit mx-auto border border-zinc-100 shadow-inner">
            <QRCodeSVG
              ref={qrRef}
              value={appUrl}
              size={180}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            <p className="font-semibold">🇪🇸 Español · 🇬🇧 English</p>
            <p className="text-[11px] text-zinc-400">🌾 Con información completa de los 14 alérgenos</p>
          </div>

          <div className="pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400">
            {appUrl}
          </div>
        </div>

        {/* Acciones de Descarga e Impresión */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={downloadPNG}
            className="w-full text-xs"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Descargar QR (PNG)
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handlePrint}
            className="w-full text-xs"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Imprimir Plantilla A5
          </Button>
        </div>
      </div>
    </div>
  );
};
