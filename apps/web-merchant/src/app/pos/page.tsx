"use client";

import { useState, useCallback } from "react";
import { ShoppingCart } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { venteAPI } from "@/features/vente/apis/vente.api";
import { usePanier } from "@/features/vente/hooks/usePanier";
import { GrilleProduits } from "@/features/vente/components/grille-produits";
import { PanierLateral } from "@/features/vente/components/panier-lateral";
import { ModalPaiement } from "@/features/vente/components/modal-paiement";
import { ConfirmationVente } from "@/features/vente/components/confirmation-vente";

export default function PagePOS() {
  const { token } = useAuth();
  const { data: produitsData } = useProduitListQuery(1);
  const { data: emplacements } = useEmplacementListQuery();
  const panier = usePanier();

  const [emplacementId, setEmplacementId] = useState("");
  const [afficherPaiement, setAfficherPaiement] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [derniereVente, setDerniereVente] = useState<{
    numero: string; total: number; monnaie: number;
  } | null>(null);

  // Selectionner le premier emplacement par defaut
  const empId = emplacementId || emplacements?.[0]?.id || "";

  const produits = produitsData?.data ?? [];

  const encaisser = useCallback(async (methode: string) => {
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

      const resultat = await venteAPI.completerTicket(token, ticket.id, {
        paiements: [{ methode, montant: ticket.total }],
      });

      setDerniereVente({
        numero: resultat.numeroTicket,
        total: resultat.total,
        monnaie: resultat.monnaie ?? 0,
      });
      panier.vider();
      setAfficherPaiement(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la vente";
      alert(msg);
    } finally {
      setEnCours(false);
    }
  }, [token, empId, panier]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Colonne gauche — Produits */}
      <div className="flex-1 flex flex-col bg-neutral-50 overflow-hidden">
        {/* En-tete POS */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingCart size={20} className="text-teal-600" />
            <span className="font-semibold text-neutral-800">Point de vente</span>
          </div>
          <select
            value={empId}
            onChange={(e) => setEmplacementId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 text-sm text-neutral-700 bg-white"
          >
            {(emplacements ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.nom}</option>
            ))}
          </select>
        </div>

        <GrilleProduits produits={produits} onAjouter={panier.ajouter} />
      </div>

      {/* Colonne droite — Panier */}
      {!afficherPaiement ? (
        <PanierLateral
          articles={panier.articles}
          total={panier.total}
          onModifierQuantite={panier.modifierQuantite}
          onRetirer={panier.retirer}
          onVider={panier.vider}
          onEncaisser={() => setAfficherPaiement(true)}
          onAttente={() => {/* TODO mettre en attente */}}
        />
      ) : (
        <div className="w-[360px] flex flex-col bg-white border-l border-neutral-200 shrink-0">
          <div className="flex-1" />
          <div className="border-t border-neutral-200 p-4 space-y-3">
            <div className="flex items-center justify-between px-4 py-3.5 rounded-lg bg-[#1B1F3B]">
              <span className="text-sm text-white/60">TOTAL</span>
              <span className="text-2xl font-bold text-white tabular-nums">
                {new Intl.NumberFormat("fr-FR").format(panier.total)}
                <span className="text-sm font-normal text-white/50 ml-1">F</span>
              </span>
            </div>
            <ModalPaiement
              total={panier.total}
              enCours={enCours}
              onPayer={encaisser}
              onFermer={() => setAfficherPaiement(false)}
            />
          </div>
        </div>
      )}

      {/* Confirmation */}
      {derniereVente && (
        <ConfirmationVente
          numeroTicket={derniereVente.numero}
          total={derniereVente.total}
          monnaie={derniereVente.monnaie}
          onNouvelle={() => setDerniereVente(null)}
        />
      )}
    </div>
  );
}
