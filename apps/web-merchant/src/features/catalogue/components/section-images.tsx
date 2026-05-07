"use client";

import { useState } from "react";
import { Button, Input } from "@heroui/react";
import { Plus, X, Image as ImageIcon } from "lucide-react";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
}

const URL_REGEX = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i;

export function SectionImages({ images, onChange, max = 6 }: Props) {
  const [urlEnCours, setUrlEnCours] = useState("");
  const [erreurUrl, setErreurUrl] = useState("");

  function ajouter() {
    const url = urlEnCours.trim();
    if (!url) return;
    if (!URL_REGEX.test(url)) {
      setErreurUrl("URL d'image invalide (jpg, png, webp, gif, avif, svg)");
      return;
    }
    if (images.length >= max) {
      setErreurUrl(`${max} images maximum`);
      return;
    }
    onChange([...images, url]);
    setUrlEnCours("");
    setErreurUrl("");
  }

  function retirer(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-2">
        Images du produit ({images.length}/{max})
      </p>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
          {images.map((url, i) => (
            <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-surface-secondary">
              <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              <Button
                variant="ghost"
                className="absolute top-1 right-1 w-6 h-6 min-w-0 p-0 bg-foreground/70 text-white hover:bg-danger/90 rounded-full"
                onPress={() => retirer(i)}
                aria-label="Retirer l'image"
              >
                <X size={12} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {images.length < max && (
        <>
          <div className="flex items-center gap-2">
            <Input
              value={urlEnCours}
              onChange={(e) => { setUrlEnCours(e.target.value); setErreurUrl(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouter(); } }}
              placeholder="https://exemple.com/photo.jpg"
              className="flex-1"
            />
            <Button variant="secondary" onPress={ajouter} isDisabled={!urlEnCours.trim()} className="gap-1.5">
              <Plus size={14} />
              Ajouter
            </Button>
          </div>
          {erreurUrl && <p className="text-xs text-danger mt-1.5">{erreurUrl}</p>}
          {!erreurUrl && images.length === 0 && (
            <p className="text-xs text-muted mt-1.5 flex items-center gap-1">
              <ImageIcon size={12} />
              Collez une URL d'image (Unsplash, votre CDN, etc.)
            </p>
          )}
        </>
      )}
    </div>
  );
}
