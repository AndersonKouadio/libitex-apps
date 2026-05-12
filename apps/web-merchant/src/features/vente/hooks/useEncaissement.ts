"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "@heroui/react";
import { venteAPI } from "../apis/vente.api";
import { creerTicketSchema } from "../schemas/vente.schema";
import { useInvalidateVenteQuery } from "../queries/index.query";
import { useNetworkStatus } from "@/lib/network-status";
import { fileOffline, QueuePleineException } from "../stores/file-attente-offline.store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useConfigFideliteQuery } from "@/features/fidelite/queries/fidelite.query";
import type { ArticlePanier, Remise, ClientPanier } from "./usePanier";
import type { ITicket } from "../types/vente.type";

interface PanierActions {
  articles: ArticlePanier[];
  sousTotal: number;
  total: number;
  remiseGlobale: Remise | null;
  note: string;
  client: ClientPanier | null;
  vider: () => void;
}

interface DerniereVente {
  numero: string;
  total: number;
  monnaie: number;
  ticket: ITicket;
  /** Vrai si la vente vient d'etre enregistree en mode hors-ligne (pas
   *  encore synchronisee). Permet a l'UI de marquer "[OFFLINE]" sur le
   *  ticket imprime pour tracabilite comptable (fix D2). */
  origineOffline: boolean;
}

/**
 * Synthese un ITicket a partir du panier pour pouvoir afficher la
 * confirmation et imprimer un ticket coherent meme en mode hors-ligne.
 * Les ids/dates sont locaux ; le vrai ticket sera cree au moment de la sync.
 */
function syntheseTicketOffline(
  numeroLocal: string,
  panier: PanierActions,
  paiements: { methode: string; montant: number; reference?: string }[],
): ITicket {
  return {
    id: `offline-${numeroLocal}`,
    numeroTicket: numeroLocal,
    statut: "OFFLINE",
    sousTotal: panier.sousTotal,
    montantTva: 0, // TVA recalculee cote backend a la sync
    montantRemise: panier.remiseGlobale?.montant ?? 0,
    total: panier.total,
    clientId: panier.client?.id ?? null,
    nomClient: panier.client?.nom,
    telephoneClient: panier.client?.telephone,
    note: panier.note || undefined,
    lignes: panier.articles.map((a, i) => ({
      id: `${numeroLocal}-${i}`,
      varianteId: a.varianteId,
      nomProduit: a.nomProduit,
      nomVariante: a.nomVariante || null,
      sku: a.sku,
      quantite: a.quantite,
      prixUnitaire: a.prixUnitaire,
      remise: a.remise?.montant ?? 0,
      tauxTva: 0,
      montantTva: 0,
      totalLigne: a.totalLigne,
      uniteVente: a.uniteVente,
      pasMin: a.pasMin,
      prixParUnite: a.prixParUnite,
      supplements: (a.supplements ?? []).map((s) => ({
        supplementId: s.supplementId,
        nom: s.nom,
        prixUnitaire: s.prixUnitaire,
        quantite: s.quantite,
      })),
    })),
    paiements: paiements.map((p, i) => ({
      id: `${numeroLocal}-p-${i}`,
      methode: p.methode,
      montant: p.montant,
      reference: p.reference,
    })),
    creeLe: new Date().toISOString(),
  };
}

/**
 * Hook qui regroupe les deux actions de cloture du panier au POS :
 * encaisser (cree + complete le ticket) et mettreEnAttente (PARK).
 * Possede l'etat de chargement et le recapitulatif de la derniere vente.
 *
 * Mode hors-ligne : si le reseau est tombe, l'encaissement bascule sur la
 * file localStorage. Le caissier voit toujours la confirmation + monnaie.
 * La sync auto reprend des le retour reseau (useSyncOffline).
 */
export function useEncaissement(panier: PanierActions, empId: string, token: string | null) {
  const [enCours, setEnCours] = useState(false);
  const [derniereVente, setDerniereVente] = useState<DerniereVente | null>(null);
  const invalidateVente = useInvalidateVenteQuery();
  const enLigne = useNetworkStatus();
  const { utilisateur } = useAuth();
  const { data: configFidelite } = useConfigFideliteQuery();
  const tenantId = utilisateur?.tenantId ?? null;
  // Garde anti-double-clic via ref : le state enCours n'est pas frais dans la
  // closure si l'utilisateur tape deux fois avant le prochain re-render.
  const verrou = useRef(false);

  const encaisser = useCallback(async (
    paiementsSaisis: { methode: string; montant: number }[],
  ) => {
    if (!token || !empId || panier.articles.length === 0) return;
    if (verrou.current) return;
    if (paiementsSaisis.length === 0) return;

    const payload = creerTicketSchema.safeParse({
      emplacementId: empId,
      remiseGlobale: panier.remiseGlobale?.montant ?? 0,
      raisonRemise: panier.remiseGlobale?.raison,
      clientId: panier.client?.id,
      nomClient: panier.client?.nom,
      telephoneClient: panier.client?.telephone,
      note: panier.note || undefined,
      lignes: panier.articles.map((a) => ({
        varianteId: a.varianteId,
        quantite: a.quantite,
        // remise par ligne : montant calcule cote front, plafonne au sous-total ligne
        remise: a.remise?.montant ?? 0,
        supplements: a.supplements.map((s) => ({
          supplementId: s.supplementId,
          quantite: s.quantite,
        })),
      })),
    });
    if (!payload.success) {
      toast.danger(payload.error.issues[0]?.message ?? "Panier invalide");
      return;
    }

    verrou.current = true;
    setEnCours(true);

    // Mode hors-ligne : on persiste la vente en file localStorage et on
    // synthese une confirmation locale. La sync sera faite par useSyncOffline
    // des le retour reseau. La cle d'idempotence (id de l'entry, UUID v4)
    // sera envoyee au backend lors de la sync pour eviter les doublons en
    // cas de drain interrompu.
    if (!enLigne) {
      if (!tenantId) {
        toast.danger("Session perdue — connectez-vous avant d'encaisser");
        setEnCours(false);
        verrou.current = false;
        return;
      }
      const numeroLocal = fileOffline.prochainNumeroLocal();
      const idEntry = fileOffline.genererId();
      const paye = paiementsSaisis.reduce((s, p) => s + p.montant, 0);
      const monnaie = Math.max(0, paye - panier.total);
      try {
        fileOffline.ajouter({
          id: idEntry,
          idempotencyKey: idEntry,
          tenantId,
          emplacementId: empId,
          payloadCreer: { ...payload.data, idempotencyKey: idEntry },
          paiements: paiementsSaisis,
          total: panier.total,
          monnaie,
          numeroLocal,
          creeLe: new Date().toISOString(),
        });
        setDerniereVente({
          numero: numeroLocal,
          total: panier.total,
          monnaie,
          ticket: syntheseTicketOffline(numeroLocal, panier, paiementsSaisis),
          origineOffline: true,
        });
        panier.vider();
        toast.warning(`Vente ${numeroLocal} enregistree hors-ligne — sera synchronisee au retour reseau`);
      } catch (err) {
        if (err instanceof QueuePleineException) {
          toast.danger(err.message);
        } else {
          toast.danger(err instanceof Error ? err.message : "Impossible d'enregistrer la vente offline");
        }
      } finally {
        setEnCours(false);
        verrou.current = false;
      }
      return;
    }

    try {
      const ticket = await venteAPI.creerTicket(token, payload.data);
      const resultat = await venteAPI.completerTicket(token, ticket.id, {
        paiements: paiementsSaisis,
      });
      setDerniereVente({
        numero: resultat.numeroTicket,
        total: resultat.total,
        monnaie: resultat.monnaie ?? 0,
        ticket: resultat,
        origineOffline: false,
      });

      // Fix m5 : feedback positif au caissier sur les points gagnes par le
      // client. Conditionnel : client lie + programme actif + au moins 1
      // point gagne (sur le montant paye hors LOYALTY).
      if (resultat.clientId && configFidelite?.actif && configFidelite.ratioGain > 0) {
        const loyaltyUtilise = paiementsSaisis
          .filter((p) => p.methode === "LOYALTY")
          .reduce((s, p) => s + p.montant, 0);
        const baseGain = Math.max(0, resultat.total - loyaltyUtilise);
        const pointsGagnes = Math.floor(baseGain / configFidelite.ratioGain);
        if (pointsGagnes > 0) {
          toast.success(`+${pointsGagnes} point${pointsGagnes > 1 ? "s" : ""} gagne${pointsGagnes > 1 ? "s" : ""} !`);
        }
      }

      panier.vider();
      invalidateVente();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Erreur lors de la vente");
    } finally {
      setEnCours(false);
      verrou.current = false;
    }
  }, [token, empId, panier, invalidateVente, enLigne, tenantId]);

  const mettreEnAttente = useCallback(async () => {
    if (!token || !empId || panier.articles.length === 0) return;
    if (verrou.current) return;
    if (!enLigne) {
      // Le panier est persiste en localStorage (fix I3) donc le caissier
      // peut juste fermer/rouvrir l'onglet sans perte. Mise en attente
      // serveur (PARKED) demande un appel API qu'on ne peut pas faire
      // offline.
      toast.warning("Mise en attente serveur indisponible hors-ligne — le panier reste sauvegarde localement");
      return;
    }
    verrou.current = true;
    setEnCours(true);
    try {
      const ticket = await venteAPI.creerTicket(token, {
        emplacementId: empId,
        remiseGlobale: panier.remiseGlobale?.montant ?? 0,
        raisonRemise: panier.remiseGlobale?.raison,
        clientId: panier.client?.id,
        nomClient: panier.client?.nom,
        telephoneClient: panier.client?.telephone,
        note: panier.note || undefined,
        lignes: panier.articles.map((a) => ({
          varianteId: a.varianteId,
          quantite: a.quantite,
          remise: a.remise?.montant ?? 0,
          supplements: a.supplements.map((s) => ({
            supplementId: s.supplementId,
            quantite: s.quantite,
          })),
        })),
      });
      await venteAPI.mettreEnAttente(token, ticket.id);
      panier.vider();
      invalidateVente();
      toast.success(`Ticket ${ticket.numeroTicket} mis en attente`);
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Erreur lors de la mise en attente");
    } finally {
      setEnCours(false);
      verrou.current = false;
    }
  }, [token, empId, panier, invalidateVente, enLigne]);

  const fermerDerniereVente = useCallback(() => setDerniereVente(null), []);

  return { enCours, derniereVente, encaisser, mettreEnAttente, fermerDerniereVente };
}
