"use client";

import imageCompression from "browser-image-compression";
import { useEffect, useRef, useState } from "react";

import { MAX_PHOTOS } from "@/lib/validation";

export type Photo = { file: File; previewUrl: string };

type Props = {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  error?: string;
};

/**
 * Fotografije se smanjuju u browseru pre slanja (~5 MB → ~0,4 MB).
 * Ponovno kodiranje usput briše EXIF podatke (GPS, model telefona…).
 */
export function PhotoInput({ photos, onChange, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const photosRef = useRef(photos);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Oslobađanje memorije za preglede kad komponenta nestane.
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setLocalError(null);
    const room = MAX_PHOTOS - photos.length;
    const selected = Array.from(files).slice(0, room);
    if (files.length > room) setLocalError(`Možeš priložiti najviše ${MAX_PHOTOS} fotografije.`);

    setBusy(true);
    try {
      const compressed = await Promise.all(
        selected.map(async (file, i) => {
          const blob = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1600,
            fileType: "image/jpeg",
            initialQuality: 0.8,
            useWebWorker: true,
          });
          const jpeg = new File([blob], `foto-${Date.now()}-${i}.jpg`, { type: "image/jpeg" });
          return { file: jpeg, previewUrl: URL.createObjectURL(jpeg) };
        }),
      );
      onChange([...photos, ...compressed]);
    } catch {
      setLocalError("Fotografiju nije moguće obraditi. Probaj neku drugu.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(index: number) {
    URL.revokeObjectURL(photos[index].previewUrl);
    onChange(photos.filter((_, i) => i !== index));
  }

  const message = localError ?? error;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, i) => (
          <div key={photo.previewUrl} className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- lokalni blob pregled */}
            <img src={photo.previewUrl} alt={`Fotografija ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Ukloni fotografiju ${i + 1}`}
              className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        ))}

        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-60"
          >
            {busy ? (
              <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-7" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.8 6.2l1.1-1.7A1.5 1.5 0 019.2 3.8h5.6c.5 0 1 .3 1.3.7l1.1 1.7H19a2 2 0 012 2V18a2 2 0 01-2 2H5a2 2 0 01-2-2V8.2a2 2 0 012-2h1.8z" />
                <circle cx="12" cy="12.5" r="3.5" />
              </svg>
            )}
            <span className="text-xs font-medium">{busy ? "Obrađujem…" : "Dodaj fotografiju"}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
    </div>
  );
}
