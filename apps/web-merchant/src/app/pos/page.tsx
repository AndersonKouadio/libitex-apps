"use client";

import { useState, useCallback } from "react";
import { Select, ListBox, Label, toast } from "@heroui/react";
import { ShoppingCart } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { venteAPI } from "@/features/vente/apis/vente.api";
import { creerTicketSchema } from "@/features/vente/schemas/vente.schema";
import { usePanier } from "@/features/vente/hooks/usePanier";
import { GrilleProduits } from "@/features/vente/components/grille-produits";
import { PanierLateral } from "@/features/vente/components/panier-lateral";
import { ModalPaiement } from "@/features/vente/components/modal-paiement";
import { ConfirmationVente } from "@/features/vente/components/confirmation-vente";
import { formatMontant } from "@/features/vente/utils/format";

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

  const empId = emplacementId || emplacements?.[0]?.id || "";
  const produits = produitsData?.data ?? [];

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
      setAfficherPaiement(false);
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
      toast.success(`Ticket ${ticket.numeroTicket} mis en attente`);
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Erreur lors de la mise en attente");
    } finally {
      setEnCours(false);
    }
  }, [token, empId, panier]);

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col bg-surface-secondary overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingCart size={20} className="text-accent" />
            <span className="font-semibold text-foreground">Point de vente</span>
          </div>
          {(emplacements ?? []).length > 0 && (
            <Select
              selectedKey={empId}
              onSelectionChange={(key) => setEmplacementId(String(key))}
              aria-label="Emplacement de caisse"
              className="min-w-[180px]"
            >
              <Label className="sr-only">Emplacement</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(emplacements ?? []).map((e) => (
                    <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>
                      {e.nom}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          )}
        </header>

        <GrilleProduits produits={produits} onAjouter={panier.ajouter} />
      </div>

      {!afficherPaiement ? (
        <PanierLateral
          articles={panier.articles}
          total={panier.total}
          onModifierQuantite={panier.modifierQuantite}
          onRetirer={panier.retirer}
          onVider={panier.vider}
          onEncaisser={() => setAfficherPaiement(true)}
          onAttente={mettreEnAttente}
        />
      ) : (
        <aside className="w-[360px] flex flex-col bg-surface border-l border-border shrink-0">
          <div className="flex-1" />
          <div className="border-t border-border p-4 space-y-3">
            <div className="flex items-center justify-between px-4 py-3.5 rounded-lg bg-navy">
              <span className="text-sm text-navy-foreground/60">TOTAL</span>
              <span className="text-2xl font-bold text-navy-foreground tabular-nums">
                {formatMontant(panier.total)}
                <span className="text-sm font-normal text-navy-foreground/50 ml-1">F</span>
              </span>
            </div>
            <ModalPaiement
              total={panier.total}
              enCours={enCours}
              onPayer={encaisser}
              onFermer={() => setAfficherPaiement(false)}
            />
          </div>
        </aside>
      )}

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
