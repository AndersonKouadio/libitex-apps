"use client";

import { useState, useCallback } from "react";
import { toast } from "@heroui/react";
import { venteAPI } from "../apis/vente.api";
import { creerTicketSchema } from "../schemas/vente.schema";
import { useInvalidateVenteQuery } from "../queries/index.query";
import type { ArticlePanier } from "./usePanier";

interface PanierActions {
  articles: ArticlePanier[];
  vider: () => void;
}

interface DerniereVente {
  numero: string;
  total: number;
  monnaie: number;
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

  const encaisser = useCallback(async (methode: string) => {
    if (!token || !empId || panier.articles.length === 0) return;

    const payload = creerTicketSchema.safeParse({
      emplacementId: empId,
      lignes: panier.articles.map((a) => ({ varianteId: a.varianteId, quantite: a.quantite })),
    });
    if (!payload.success) {
      toast.danger(payload.error.issues[0]?.message ?? "Panier invalide");
      return;
    }

    setEnCours(true);
    try {
      const ticket = await venteAPI.creerTicket(token, payload.data);
      const resultat = await venteAPI.completerTicket(token, ticket.id, {
        paiements: [{ methode, montant: ticket.total }],
      });
      setDerniereVente({
        numero: resultat.numeroTicket,
        total: resultat.total,
        monnaie: resultat.monnaie ?? 0,
      });
      panier.vider();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Erreur lors de la vente");
    } finally {
      setEnCours(false);
    }
  }, [token, empId, panier]);

  const mettreEnAttente = useCallback(async () => {
    if (!token || !empId || panier.articles.length === 0) return;
    setEnCours(true);
    try {
      const ticket = await venteAPI.creerTicket(token, {
        emplacementId: empId,
        lignes: panier.articles.map((a) => ({
          varianteId: a.varianteId,
          quantite: a.quantite,
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
    }
  }, [token, empId, panier, invalidateVente]);

  const fermerDerniereVente = useCallback(() => setDerniereVente(null), []);

  return { enCours, derniereVente, encaisser, mettreEnAttente, fermerDerniereVente };
}
