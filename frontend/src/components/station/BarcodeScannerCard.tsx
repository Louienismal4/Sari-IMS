"use client";

import { RefObject } from "react";
import {
  Barcode,
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BarcodeScannerCardProps {
  isCameraActive: boolean;
  onStartCamera: () => void;
  onStopCamera: () => void;
  hasTorchCapability: boolean;
  torchOn: boolean;
  onToggleTorch: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  barcodeInputRef: RefObject<HTMLInputElement | null>;
  onBarcodeSubmit: (e: React.FormEvent) => void;
}

export function BarcodeScannerCard({
  isCameraActive,
  onStartCamera,
  onStopCamera,
  hasTorchCapability,
  torchOn,
  onToggleTorch,
  videoRef,
  barcodeInput,
  setBarcodeInput,
  barcodeInputRef,
  onBarcodeSubmit,
}: BarcodeScannerCardProps) {
  return (
    <Card className="shadow-2xs border-zinc-200">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center">
              <Barcode className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-zinc-900">Barcode Scanner</CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Scan physical retail barcodes live via phone camera
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isCameraActive && hasTorchCapability && (
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleTorch}
                className="h-8 w-8 min-h-[44px] min-w-[44px] text-amber-600"
                title="Toggle Flashlight"
                aria-label={torchOn ? "Turn off camera flashlight" : "Turn on camera flashlight"}
              >
                {torchOn ? <FlashlightOff className="w-4 h-4" /> : <Flashlight className="w-4 h-4" />}
              </Button>
            )}
            <Button
              variant={isCameraActive ? "destructive" : "default"}
              size="sm"
              onClick={isCameraActive ? onStopCamera : onStartCamera}
              className="gap-1.5 min-h-[36px]"
              aria-label={isCameraActive ? "Stop live camera scanner" : "Start live camera scanner"}
            >
              {isCameraActive ? (
                <>
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan Barcode</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        {/* Live Camera Viewfinder */}
        {isCameraActive && (
          <div className="relative rounded-xl overflow-hidden bg-black aspect-4/3 sm:aspect-video border border-zinc-300 shadow-inner flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              aria-label="Live camera viewfinder for scanning retail barcodes"
              className="w-full h-full object-cover"
            />
            {/* Targeting Reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6" aria-hidden="true">
              <div className="w-full h-3/4 max-w-xs border-2 border-emerald-400/80 rounded-xl relative shadow-[0_0_15px_rgba(52,211,153,0.3)] overflow-hidden">
                <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-300 z-10" />
                <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-300 z-10" />
                <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-300 z-10" />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-300 z-10" />
                <div className="absolute inset-x-0 h-0.5 bg-emerald-400 animate-laser-sweep" />
              </div>
            </div>
            <div className="absolute bottom-2.5 inset-x-0 text-center pointer-events-none" aria-hidden="true">
              <span className="text-xs bg-zinc-950/85 text-emerald-300 font-mono font-semibold px-3 py-1 rounded-full border border-emerald-500/40 shadow-sm">
                Align barcode inside target frame
              </span>
            </div>
          </div>
        )}

        {/* Manual Barcode Input Form */}
        <form onSubmit={onBarcodeSubmit} className="space-y-2">
          <div className="relative">
            <Input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan or type barcode (e.g. 4800016644810)..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="pl-8 pr-20 font-mono text-xs"
              aria-label="Barcode or SKU search input"
            />
            <Barcode className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 top-1 h-6 px-2.5 text-xs"
            >
              Lookup
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Optimized for retail products (Lucky Me, Kopiko, 555 Sardines) via optical camera &amp; USB readers.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
