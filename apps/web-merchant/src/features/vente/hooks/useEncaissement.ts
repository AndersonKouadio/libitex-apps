"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "@heroui/react";
import { venteAPI } from "../apis/vente.api";
import { creerTicketSchema } from "../schemas/vente.schema";
import { useInvalidateVenteQuery } from "../queries/index.query";
import type { ArticlePanier, Remise, ClientPanier } from "./usePanier";
import type { ITicket } from "../types/vente.type";

interface PanierActions {
  articles: ArticlePanier[];
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
}

/**
 * Hook qui regroupe les deux actions de cloture du panier au POS :
 * encaisser (cree + complete le ticket) et mettreEnAttente (PARK).
 * Possede l'etat de chargement et le recapitulatif de la derniere vente.
 */
export function useEncaissement(panier: PanierActions, empId: string, token: string | null) {
  const [enCours, setEnCours] = useState(false);
  const [derniereVente, setDerniereVente] = useState<DerniereVente | null>(null);
  const invalidateVente = useInvalidateVenteQuery();
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
      });
      panier.vider();
      invalidateVente();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Erreur lors de la vente");
    } finally {
      setEnCours(false);
      verrou.current = false;
    }
  }, [token, empId, panier, invalidateVente]);

  const mettreEnAttente = useCallback(async () => {
    if (!token || !empId || panier.articles.length === 0) return;
    if (verrou.current) return;
    verrou.current = true;
    setEnCours(true);
    try {
      const ticket = await venteAPI.creerTicket(token, {
        emplacementId: empId,
        remiseGlobale: panier.remiseGlobale?.montant ?? 0,
        raisonRemise: panier.remiseGlobale?.raison,
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
  }, [token, empId, panier, invalidateVente]);

  const fermerDerniereVente = useCallback(() => setDerniereVente(null), []);

  return { enCours, derniereVente, encaisser, mettreEnAttente, fermerDerniereVente };
}
