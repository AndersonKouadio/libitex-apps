"use client";

import { CloudOff, AlertTriangle, Loader2 } from "lucide-react";
import { useNetworkStatus } from "@/lib/network-status";
import { useFileOfflineTenant } from "@/features/vente/stores/file-attente-offline.store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useEtatDrain } from "@/providers/sync-offline-provider";

interface Props {
  onVoirFile: () => void;
}

/**
 * Banner discret affiche en haut de page :
 * - en orange "Hors-ligne" quand le reseau est tombe
 * - en rouge "X vente(s) en conflit" si certaines entrees ont une erreur
 *   au moment de la sync (stock epuise entre-temps...)
 * - en bleu "X vente(s) en cours de sync" si la file n'est pas vide mais
 *   qu'on est online et qu'il n'y a pas d'erreur
 *
 * Filtre par tenant courant (fix C2) : on ne compte que les ventes du
 * tenant actif, pour eviter d'afficher un compteur faux apres switch
 * de boutique.
 *
 * Cliquable pour ouvrir la modale qui liste les ventes en attente.
 */
export function BannerHorsLigne({ onVoirFile }: Props) {
  const enLigne = useNetworkStatus();
  const { utilisateur } = useAuth();
  const file = useFileOfflineTenant(utilisateur?.tenantId);
  const drain = useEtatDrain();
  const conflits = file.filter((v) => v.erreur).length;
  const enAttente = file.length;

  if (enLigne && enAttente === 0) return null;

  let ton: "warning" | "info" | "danger" = "info";
  let icone = <CloudOff size={14} strokeWidth={2.5} />;
  let texte = "";

  if (!enLigne) {
    ton = "warning";
    icone = <CloudOff size={14} strokeWidth={2.5} />;
    texte = enAttente > 0
      ? `Hors-ligne — ${enAttente} vente${enAttente > 1 ? "s" : ""} en attente`
      : "Hors-ligne — les ventes seront synchronisees au retour reseau";
  } else if (conflits > 0) {
    ton = "danger";
    icone = <AlertTriangle size={14} strokeWidth={2.5} />;
    texte = `${conflits} vente${conflits > 1 ? "s" : ""} en conflit — clic pour resoudre`;
  } else if (drain.enCours && drain.total > 0) {
    // Progression detaillee (fix I4) : on affiche X/N pendant que le drain
    // tourne. Spinner anime pour confirmer visuellement l'activite.
    ton = "info";
    icone = <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />;
    texte = `Synchronisation ${drain.traites}/${drain.total} — clic pour voir`;
  } else {
    ton = "info";
    texte = `Synchronisation en cours — ${enAttente} vente${enAttente > 1 ? "s" : ""}`;
  }

  const couleurs = {
    warning: "bg-warning/10 text-warning border-warning/20",
    info: "bg-accent/10 text-accent border-accent/20",
    danger: "bg-danger/10 text-danger border-danger/20",
  }[ton];

  // Position sticky (au lieu de fixed) : le banner pousse le contenu vers
  // le bas quand il apparait, donc plus de chevauchement avec la topbar
  // (fix M3). Il reste colle en haut au scroll comme `fixed`, sans avoir
  // a injecter un padding-top compensatoire ailleurs dans le layout.
  return (
    <button
      type="button"
      onClick={onVoirFile}
      className={`sticky top-0 z-50 w-full ${couleurs} border-b text-xs font-medium px-3 py-1.5 flex items-center justify-center gap-2 transition-colors hover:brightness-95 safe-top`}
      aria-label="Voir la file des ventes hors-ligne"
    >
      {icone}
      <span className="truncate">{texte}</span>
    </button>
  );
}
