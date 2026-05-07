"use client";

import { useRef, useState } from "react";
import { Button, toast } from "@heroui/react";
import { Upload, X, ImagePlus, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { uploaderImage } from "../apis/upload.api";

interface Props {
  cible: "produits" | "boutiques" | "categories";
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
}

const TYPES_AUTORISES = ["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif"];

export function ZoneUploadImages({ cible, images, onChange, max = 6 }: Props) {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [glisser, setGlisser] = useState(false);

  async function uploaderFichiers(fichiers: FileList | File[]) {
    if (!token) {
      toast.danger("Connexion requise");
      return;
    }
    const liste = Array.from(fichiers).filter((f) => TYPES_AUTORISES.includes(f.type));
    if (liste.length === 0) {
      toast.danger("Format d'image non supporté");
      return;
    }
    const restantes = max - images.length;
    if (restantes <= 0) {
      toast.warning(`${max} images maximum`);
      return;
    }
    const aTraiter = liste.slice(0, restantes);

    setUploadEnCours(true);
    try {
      const resultats = await Promise.all(aTraiter.map((f) => uploaderImage(token, cible, f)));
      onChange([...images, ...resultats.map((r) => r.url)]);
      toast.success(`${resultats.length} image${resultats.length > 1 ? "s" : ""} ajoutée${resultats.length > 1 ? "s" : ""}`);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Échec de l'upload");
    } finally {
      setUploadEnCours(false);
    }
  }

  function retirer(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function onChangeInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      uploaderFichiers(e.target.files);
    }
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setGlisser(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploaderFichiers(e.dataTransfer.files);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-2">
        Images ({images.length}/{max})
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={TYPES_AUTORISES.join(",")}
        multiple
        onChange={onChangeInput}
        className="hidden"
      />

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
        {images.map((url, i) => (
          <div
            key={url}
            className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-surface-secondary"
          >
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

        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setGlisser(true); }}
            onDragLeave={() => setGlisser(false)}
            onDrop={onDrop}
            disabled={uploadEnCours}
            className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted transition-colors ${
              glisser
                ? "border-accent bg-accent/5 text-accent"
                : "border-border hover:border-accent/50 hover:bg-surface-secondary hover:text-foreground"
            } ${uploadEnCours ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            aria-label="Ajouter des images"
          >
            {uploadEnCours ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <ImagePlus size={20} />
                <span className="text-[10px] font-medium">Ajouter</span>
              </>
            )}
          </button>
        )}
      </div>

      {images.length === 0 && (
        <p className="text-xs text-muted flex items-center gap-1">
          <Upload size={12} />
          Glissez-déposez vos images ou cliquez sur le cadre. Max {max} images, 5 Mo chacune.
        </p>
      )}
    </div>
  );
}
