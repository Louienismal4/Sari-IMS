"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

export function playAudioBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {}
}

export function useBarcodeScanner(onBarcodeDetected: (code: string) => void) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorchCapability, setHasTorchCapability] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const nativeAnimFrameRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {}
      zxingControlsRef.current = null;
    }
    if (nativeAnimFrameRef.current) {
      cancelAnimationFrame(nativeAnimFrameRef.current);
      nativeAnimFrameRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setTorchOn(false);
    setHasTorchCapability(false);
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await (track as MediaStreamTrack & { applyConstraints: (c: Record<string, unknown>) => Promise<void> }).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.error("Failed to toggle torch:", e);
    }
  }, [torchOn]);

  const handleDetected = useCallback(
    (code: string) => {
      playAudioBeep();
      stopCamera();
      onBarcodeDetected(code);
    },
    [stopCamera, onBarcodeDetected]
  );

  const startCamera = useCallback(async () => {
    if (isCameraActive) {
      stopCamera();
      return;
    }

    setIsCameraActive(true);

    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      });

      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track as MediaStreamTrack & { getCapabilities?: () => { torch?: boolean } }).getCapabilities?.();
        if (capabilities && "torch" in capabilities) {
          setHasTorchCapability(true);
        }
      }

      // Check Native BarcodeDetector API first
      if ("BarcodeDetector" in window) {
        try {
          const detector = new (window as unknown as {
            BarcodeDetector: new (opts: { formats: string[] }) => {
              detect: (v: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
            };
          }).BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
          });

          let isDetecting = true;
          const detectLoop = async () => {
            if (!isDetecting || !videoRef.current) return;
            try {
              if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  isDetecting = false;
                  handleDetected(barcodes[0].rawValue);
                  return;
                }
              }
            } catch {}
            nativeAnimFrameRef.current = requestAnimationFrame(detectLoop);
          };
          nativeAnimFrameRef.current = requestAnimationFrame(detectLoop);
          return;
        } catch {}
      }

      // Fallback: ZXing Library
      const codeReader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 80 });
      const controls = await codeReader.decodeFromVideoElement(videoRef.current, (result) => {
        if (result) {
          const text = result.getText();
          if (text) {
            handleDetected(text);
          }
        }
      });
      zxingControlsRef.current = controls;
    } catch (err) {
      console.error("Camera access failed:", err);
      stopCamera();
    }
  }, [isCameraActive, handleDetected, stopCamera]);

  const handleBarcodeSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const code = barcodeInput.trim();
      if (!code) return;
      handleDetected(code);
      setBarcodeInput("");
    },
    [barcodeInput, handleDetected]
  );

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    isCameraActive,
    onStartCamera: startCamera,
    onStopCamera: stopCamera,
    hasTorchCapability,
    torchOn,
    onToggleTorch: toggleTorch,
    videoRef,
    barcodeInput,
    setBarcodeInput,
    barcodeInputRef,
    onBarcodeSubmit: handleBarcodeSubmit,
  };
}
