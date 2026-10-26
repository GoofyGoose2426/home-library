"use client";

import { useEffect, useRef, useState } from "react";

// Reads a book's ISBN barcode with the phone's back camera. Uses the
// browser's built-in barcode reader where there is one (Chrome on Android),
// and the ZXing library everywhere else.

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => Detector;
  }
}

// Book barcodes are EAN-13 numbers starting 978 or 979: the ISBN-13.
function asIsbn(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return /^97[89]\d{10}$/.test(digits) ? digits : null;
}

export function BarcodeScanner({ onIsbn, onClose }: { onIsbn: (isbn: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState("Starting the camera…");
  const done = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopZxing: (() => void) | null = null;

    const found = (raw: string) => {
      const isbn = asIsbn(raw);
      if (!isbn) {
        setMessage("That barcode isn't an ISBN. Try the one on the back cover, above the price.");
        return false;
      }
      if (done.current) return true;
      done.current = true;
      navigator.vibrate?.(60);
      onIsbn(isbn);
      return true;
    };

    (async () => {
      try {
        if (window.BarcodeDetector) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          if (!video.current) return;
          video.current.srcObject = stream;
          await video.current.play();
          setMessage("Point the camera at the barcode on the back of the book.");
          const detector = new window.BarcodeDetector({ formats: ["ean_13"] });
          const tick = async () => {
            if (done.current || !video.current) return;
            try {
              const codes = await detector.detect(video.current);
              if (codes.some((c) => found(c.rawValue))) return;
            } catch {}
            timer = setTimeout(tick, 200);
          };
          tick();
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();
          if (!video.current) return;
          setMessage("Point the camera at the barcode on the back of the book.");
          const controls = await reader.decodeFromConstraints(
            { video: { facingMode: "environment" } },
            video.current,
            (result) => {
              if (result && found(result.getText())) controls.stop();
            },
          );
          stopZxing = () => controls.stop();
        }
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        setMessage(
          name === "NotAllowedError"
            ? "The camera is blocked. Allow camera access for this site in Chrome's settings, then try again."
            : "The camera couldn't start. You can type the ISBN instead.",
        );
      }
    })();

    return () => {
      if (timer) clearTimeout(timer);
      stopZxing?.();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onIsbn]);

  return (
    <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-black">
      <div className="relative">
        <video ref={video} muted playsInline className="aspect-[4/3] w-full object-cover" />
        {/* A guide box to line the barcode up in. */}
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-white/80" />
      </div>
      <div className="flex items-center justify-between gap-3 bg-surface px-4 py-3">
        <p className="text-sm" aria-live="polite">
          {message}
        </p>
        <button type="button" onClick={onClose} className="min-h-10 shrink-0 rounded-full border border-border px-4 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
