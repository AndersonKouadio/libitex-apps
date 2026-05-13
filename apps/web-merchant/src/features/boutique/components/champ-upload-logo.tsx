"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast, Button } from "@heroui/react";
import { Upload, Trash2, ImagePlus, Loader2 } from "lucide-react";
import { uploaderImage } from "@/features/upload/apis/upload.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface Props {
  /** URL actuelle du logo, null si pas encore configure. */
  valeur: string | null;
  /** Callback declenche apres upload reussi (URL minio) ou retrait (null). */
  onChange: (url: string | null) => void;
  /** Bloque les interactions pendant que le parent enregistre. */
  isDisabled?: boolean;
}

/**
 * Module 14 D1 : champ upload logo boutique. Workflow :
 * 1. Click sur le rond -> ouvre file picker (PNG/JPEG/WebP)
 * 2. Upload vers /uploads/image/boutiques (multipart)
 * 3. L'endpoint retourne { url } qu'on remonte via onChange
 * 4. Le parent (formulaire profil) enregistre le tenant avec logoUrl
 *
 * Limites cote front (avant upload) :
 * - Taille < 2 Mo (suffisant pour un logo)
 * - Types : image/png, image/jpeg, image/webp
 * Le backend valide aussi (max 5 Mo + types autorises).
 */
const MAX_TAILLE = 2 * 1024 * 1024; // 2 Mo
const TYPES_AUTORISES = ["image/png", "image/jpeg", "image/webp"];

export function ChampUploadLogo({ valeur, onChange, isDisabled }: Props) {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);

  function ouvrirPicker() {
    if (!isDisabled && !enCours) inputRef.current?.click();
  }

  async function gererFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = ""; // reset pour pouvoir re-uploader le meme fichier
    if (!fichier || !token) return;

    if (!TYPES_AUTORISES.includes(fichier.type)) {
      toast.danger("Format invalide. Utilisez PNG, JPEG ou WebP.");
      return;
    }
    if (fichier.size > MAX_TAILLE) {
      toast.danger("Image trop grande. Maximum 2 Mo.");
      return;
    }

    setEnCours(true);
    try {
      const { url } = await uploaderImage(token, "boutiques", fichier);
      onChange(url);
      toast.success("Logo telecharge");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Echec de l'upload");
    } finally {
      setEnCours(false);
    }
  }

  function retirer() {
    if (isDisabled || enCours) return;
    onChange(null);
    toast.success("Logo retire");
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={ouvrirPicker}
        disabled={isDisabled || enCours}
        aria-label={valeur ? "Changer le logo" : "Ajouter un logo"}
        className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-dashed border-border hover:border-accent/60 bg-surface flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {enCours ? (
          <Loader2 size={20} className="text-muted animate-spin" />
        ) : valeur ? (
          <>
            <Image
              src={valeur}
              alt="Logo de la boutique"
              fill
              sizes="80px"
              className="object-cover"
            />
            <span className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Upload size={18} className="text-white" />
            </span>
          </>
        ) : (
          <ImagePlus size={22} className="text-muted" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Logo de la boutique</p>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">
          Apparait sur votre vitrine en ligne et lors du partage du lien.
          PNG, JPEG ou WebP, max 2 Mo.
        </p>
        {valeur && (
          <Button
            variant="ghost"
            className="mt-2 h-7 px-2 text-xs text-danger gap-1"
            onPress={retirer}
            isDisabled={isDisabled || enCours}
          >
            <Trash2 size={11} /> Retirer
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={TYPES_AUTORISES.join(",")}
        onChange={gererFichier}
        className="hidden"
        disabled={isDisabled}
      />
    </div>
  );
}
