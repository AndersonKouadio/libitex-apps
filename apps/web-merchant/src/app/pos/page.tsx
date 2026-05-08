"use client";

import { useState, useMemo } from "react";
import {
  Select, ListBox, Label, Button, Chip, Drawer, Modal,
} from "@heroui/react";
import { ShoppingCart, PauseCircle, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import { estDisponibleMaintenant } from "@/features/catalogue/utils/disponibilite";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { useStockEmplacementQuery } from "@/features/stock/queries/stock-emplacement.query";
import { ModalEmplacement } from "@/features/stock/components/modal-emplacement";
import { AucunEmplacement } from "@/components/empty-states/aucun-emplacement";
import { usePanier } from "@/features/vente/hooks/usePanier";
import { useTicketListQuery } from "@/features/vente/queries/ticket-list.query";
import { GrilleProduits } from "@/features/vente/components/grille-produits";
import { PanierVente } from "@/features/vente/components/panier-vente";
import { ModalPaiement } from "@/features/vente/components/modal-paiement";
import { ConfirmationVente } from "@/features/vente/components/confirmation-vente";
import { ModalTicketsAttente } from "@/features/vente/components/modal-tickets-attente";
import { ModalSaisirQuantite } from "@/features/vente/components/modal-saisir-quantite";
import { ModalSupplements } from "@/features/vente/components/modal-supplements";
import { useSaisieQuantite } from "@/features/vente/hooks/useSaisieQuantite";
import { useEncaissement } from "@/features/vente/hooks/useEncaissement";
import { formatMontant } from "@/features/vente/utils/format";

export default function PagePOS() {
  const { token } = useAuth();
  const { data: produitsData } = useProduitListQuery(1);
  const { data: emplacements } = useEmplacementListQuery();
  const panier = usePanier();

  const [emplacementId, setEmplacementId] = useState("");
  const [paiementOuvert, setPaiementOuvert] = useState(false);
  const [panierMobileOuvert, setPanierMobileOuvert] = useState(false);
  const [modalEmpOuvert, setModalEmpOuvert] = useState(false);
  const [modalAttenteOuvert, setModalAttenteOuvert] = useState(false);

  const aucunEmplacement = emplacements !== undefined && emplacements.length === 0;
  const empId = emplacementId || emplacements?.[0]?.id || "";
  const { data: stocks } = useStockEmplacementQuery(empId || undefined);
  const tousLesProduits = produitsData?.data ?? [];
  // Filtre actif : produit actif + en stock + plage horaire valide + emplacement autorise.
  // Le filtrage est fait cote front pour eviter un round-trip a chaque tap, et reactif
  // grace au refetch automatique de TanStack Query (refetchOnMount + window focus).
  const produits = useMemo(
    () => tousLesProduits.filter((p) => p.actif && estDisponibleMaintenant(p, empId)),
    [tousLesProduits, empId],
  );

  const { data: ticketsAttenteData } = useTicketListQuery({ statut: "PARKED", page: 1 });
  const nombreEnAttente = (ticketsAttenteData?.data ?? []).filter((t) => t.statut === "PARKED").length;

  const saisieQuantite = useSaisieQuantite(panier, produits);
  const encaissement = useEncaissement(panier, empId, token);
  // Index de la ligne en cours de personnalisation (suppléments). null = ferme.
  const [ligneSupplements, setLigneSupplements] = useState<number | null>(null);
  const articleEnCours = ligneSupplements !== null ? panier.articles[ligneSupplements] : undefined;

  function ouvrirSupplements(indexLigne: number) {
    setLigneSupplements(indexLigne);
  }
  function confirmerSupplements(supplements: typeof panier.articles[number]["supplements"]) {
    if (ligneSupplements !== null) {
      panier.definirSupplementsLigne(ligneSupplements, supplements);
    }
    setLigneSupplements(null);
  }

  async function lancerEncaissement(methode: string) {
    await encaissement.encaisser(methode);
    setPaiementOuvert(false);
    setPanierMobileOuvert(false);
  }

  async function lancerMiseEnAttente() {
    await encaissement.mettreEnAttente();
    setPanierMobileOuvert(false);
  }

  if (aucunEmplacement) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-surface-secondary p-4">
          <div className="max-w-md w-full">
            <AucunEmplacement onCreer={() => setModalEmpOuvert(true)} contexte="pos" />
          </div>
        </div>
        <ModalEmplacement ouvert={modalEmpOuvert} onFermer={() => setModalEmpOuvert(false)} />
      </>
    );
  }

  const ouvrirEncaissement = () => {
    setPanierMobileOuvert(false);
    setPaiementOuvert(true);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col bg-surface-secondary overflow-hidden">
        <header className="flex items-center justify-between gap-2 px-3 sm:px-4 border-b border-border bg-surface shrink-0 safe-top">
          <div className="h-14 flex items-center gap-2 min-w-0">
            <ShoppingCart size={18} className="text-accent shrink-0" />
            <span className="font-semibold text-foreground text-sm sm:text-base">Caisse</span>
          </div>
          <div className="h-14 flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              className="gap-1.5 text-muted hover:text-warning relative px-2 sm:px-3"
              onPress={() => setModalAttenteOuvert(true)}
              aria-label="Tickets en attente"
            >
              <PauseCircle size={18} strokeWidth={2} />
              <span className="hidden sm:inline">Attente</span>
              {nombreEnAttente > 0 && (
                <Chip className="bg-warning text-warning-foreground text-[10px] h-4 min-w-4 px-1">
                  {nombreEnAttente}
                </Chip>
              )}
            </Button>
            {(emplacements ?? []).length > 0 && (
              <Select
                selectedKey={empId}
                onSelectionChange={(key) => setEmplacementId(String(key))}
                aria-label="Emplacement de caisse"
                className="min-w-[140px] sm:min-w-[180px]"
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
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col pb-20 lg:pb-0">
          <GrilleProduits produits={produits} stocks={stocks} onAjouter={saisieQuantite.ajouterDepuisGrille} />
        </div>
      </div>

      {/* Panier en colonne fixe — desktop uniquement */}
      <div className="hidden lg:flex">
        <PanierVente
          mode="lateral"
          articles={panier.articles}
          total={panier.total}
          nombreArticles={panier.nombreArticles}
          onModifierQuantite={panier.modifierQuantite}
          onDefinirQuantite={panier.definirQuantite}
          onRetirer={panier.retirer}
          onVider={panier.vider}
          onEncaisser={() => setPaiementOuvert(true)}
          onAttente={lancerMiseEnAttente}
          onSaisirQuantite={saisieQuantite.ouvrirPourLigne}
          onPersonnaliser={ouvrirSupplements}
        />
      </div>

      {/* Bouton flottant mobile pour ouvrir le panier */}
      <button
        type="button"
        onClick={() => setPanierMobileOuvert(true)}
        className="lg:hidden fixed left-3 right-3 bottom-3 z-30 bg-navy text-navy-foreground rounded-2xl shadow-lg flex items-center justify-between px-4 py-3 active:scale-[0.99] transition-transform safe-bottom"
        aria-label="Ouvrir le panier"
      >
        <span className="flex items-center gap-2">
          <span className="relative">
            <ShoppingCart size={20} />
            {panier.nombreArticles > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                {panier.nombreArticles}
              </span>
            )}
          </span>
          <span className="text-sm font-semibold">
            {panier.articles.length === 0 ? "Panier vide" : "Voir le panier"}
          </span>
        </span>
        <span className="text-base font-bold tabular-nums">
          {formatMontant(panier.total)}
          <span className="text-xs font-normal text-navy-foreground/50 ml-1">F</span>
        </span>
      </button>

      {/* Drawer panier mobile */}
      <Drawer.Backdrop
        isOpen={panierMobileOuvert}
        onOpenChange={(o) => setPanierMobileOuvert(o)}
      >
        <Drawer.Content placement="right" className="lg:hidden w-full sm:w-[420px]">
          <Drawer.Dialog>
            <Drawer.CloseTrigger>
              <Button
                variant="ghost"
                className="absolute top-3 right-3 z-10 p-2 h-auto min-w-0"
                aria-label="Fermer"
              >
                <X size={18} />
              </Button>
            </Drawer.CloseTrigger>
            <PanierVente
              mode="plein"
              articles={panier.articles}
              total={panier.total}
              nombreArticles={panier.nombreArticles}
              onModifierQuantite={panier.modifierQuantite}
              onDefinirQuantite={panier.definirQuantite}
              onRetirer={panier.retirer}
              onVider={panier.vider}
              onEncaisser={ouvrirEncaissement}
              onAttente={lancerMiseEnAttente}
              onSaisirQuantite={saisieQuantite.ouvrirPourLigne}
              onPersonnaliser={ouvrirSupplements}
            />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>

      {/* Modal de paiement (mobile + desktop) */}
      <Modal.Backdrop isOpen={paiementOuvert} onOpenChange={(o) => setPaiementOuvert(o)}>
        <Modal.Container size="sm" scroll="inside">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Paiement · {formatMontant(panier.total)} F</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <ModalPaiement
                total={panier.total}
                enCours={encaissement.enCours}
                onPayer={lancerEncaissement}
                onFermer={() => setPaiementOuvert(false)}
              />
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {encaissement.derniereVente && (
        <ConfirmationVente
          numeroTicket={encaissement.derniereVente.numero}
          total={encaissement.derniereVente.total}
          monnaie={encaissement.derniereVente.monnaie}
          ticket={encaissement.derniereVente.ticket}
          onNouvelle={encaissement.fermerDerniereVente}
        />
      )}

      <ModalTicketsAttente
        ouvert={modalAttenteOuvert}
        onFermer={() => setModalAttenteOuvert(false)}
        emplacementId=""
        produits={produits}
        onReprendre={(lignes, images) => panier.chargerDepuisTicket(lignes, images)}
      />

      {saisieQuantite.saisie && (
        <ModalSaisirQuantite
          ouvert
          onFermer={saisieQuantite.fermer}
          onConfirmer={saisieQuantite.confirmer}
          nomProduit={saisieQuantite.saisie.produit.nom}
          nomVariante={saisieQuantite.saisie.variante.nom || saisieQuantite.saisie.variante.sku}
          uniteVente={saisieQuantite.saisie.variante.uniteVente}
          pasMin={saisieQuantite.saisie.variante.pasMin}
          prixUnitaire={saisieQuantite.saisie.variante.prixDetail}
          prixParUnite={saisieQuantite.saisie.variante.prixParUnite}
          quantiteCourante={saisieQuantite.saisie.quantiteCourante}
        />
      )}

      {articleEnCours && (
        <ModalSupplements
          ouvert
          nomProduit={articleEnCours.nomProduit}
          prixBase={articleEnCours.prixUnitaire * articleEnCours.quantite}
          supplementsCourants={articleEnCours.supplements}
          onConfirmer={confirmerSupplements}
          onFermer={() => setLigneSupplements(null)}
        />
      )}
    </div>
  );
}
