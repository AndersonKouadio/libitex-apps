"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Select, ListBox, Label, Button, Chip, Drawer, Modal, Spinner, toast,
} from "@heroui/react";
import { ShoppingCart, PauseCircle, X, Lock } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useProduitListQuery } from "@/features/catalogue/queries/produit-list.query";
import { estDisponibleMaintenant } from "@/features/catalogue/utils/disponibilite";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { useStockEmplacementQuery } from "@/features/stock/queries/stock-emplacement.query";
import { useDisponibilitesQuery } from "@/features/catalogue/queries/disponibilites.query";
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
import { ModalRemise } from "@/features/vente/components/modal-remise";
import { ModalClientPanier } from "@/features/vente/components/modal-client-panier";
import { ModalApercuTicket } from "@/features/vente/components/modal-apercu-ticket";
import { useSaisieQuantite } from "@/features/vente/hooks/useSaisieQuantite";
import { useEncaissement } from "@/features/vente/hooks/useEncaissement";
import { useScanProduit } from "@/features/vente/hooks/useScanProduit";
import { BarreScan, type BarreScanHandle } from "@/features/vente/components/barre-scan";
import { BanniereCompatMateriel } from "@/features/vente/components/banniere-compat-materiel";
import { ModalScannerCamera } from "@/features/vente/components/modal-scanner-camera";
import { formatMontant } from "@/features/vente/utils/format";
import { useSessionActiveQuery } from "@/features/session-caisse/queries/session-active.query";
import { FormulaireOuvertureCaisse } from "@/features/session-caisse/components/formulaire-ouverture-caisse";
import { ModalFermetureCaisse } from "@/features/session-caisse/components/modal-fermeture-caisse";

export default function PagePOS() {
  const { token, utilisateur } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // POS : charger TOUS les produits (vrais + supplements) pour pouvoir vendre
  // n'importe quel article a la commande. Filtrage par categorie cote front.
  // actif=true : un produit desactive depuis le catalogue ne doit plus
  // apparaitre au POS — invalidation TanStack provoque un refetch immediat.
  const { data: produitsData } = useProduitListQuery(
    1, undefined, { isSupplement: null, actif: true, refetchAuto: true },
  );
  const { data: emplacements } = useEmplacementListQuery();
  const panier = usePanier();

  const [emplacementId, setEmplacementId] = useState("");
  const [paiementOuvert, setPaiementOuvert] = useState(false);
  const [panierMobileOuvert, setPanierMobileOuvert] = useState(false);
  const [modalEmpOuvert, setModalEmpOuvert] = useState(false);
  const [modalAttenteOuvert, setModalAttenteOuvert] = useState(false);
  const [modalFermetureOuvert, setModalFermetureOuvert] = useState(false);

  // La sidebar POS pousse ?attente=<timestamp> ou ?fermer=<timestamp> dans
  // l'URL pour ouvrir la modale correspondante. Le timestamp force le re-fire
  // du useEffect a chaque clic meme si on est deja sur /pos.
  const attenteParam = searchParams.get("attente");
  const fermerParam = searchParams.get("fermer");
  useEffect(() => {
    if (attenteParam) {
      setModalAttenteOuvert(true);
      router.replace("/pos");
    }
  }, [attenteParam, router]);
  useEffect(() => {
    if (fermerParam) {
      setModalFermetureOuvert(true);
      router.replace("/pos");
    }
  }, [fermerParam, router]);

  // Le POS ne propose que les emplacements de type STORE (boutique). Les
  // entrepots, stands, camions etc. peuvent contenir du stock mais ne servent
  // pas a vendre directement.
  const emplacementsCaisse = useMemo(
    () => (emplacements ?? []).filter((e) => e.type === "STORE"),
    [emplacements],
  );
  const aucunEmplacement = emplacements !== undefined && emplacementsCaisse.length === 0;
  const empId = emplacementId || emplacementsCaisse[0]?.id || "";
  const empCourant = emplacementsCaisse.find((e) => e.id === empId);
  const { data: stocks } = useStockEmplacementQuery(empId || undefined);
  const { data: dispos } = useDisponibilitesQuery(empId || undefined);
  const { data: sessionActive, isLoading: chargementSession } = useSessionActiveQuery(empId || null);
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

  // Sets memoizes pour O(1) au moment du scan (un scan toutes les ~2s peut
  // se transformer en ~30 scans/min avec une grosse file, donc on evite
  // les .includes() en boucle).
  const indispoVariantesSet = useMemo(
    () => new Set(dispos?.indisponibles ?? []),
    [dispos],
  );
  const indispoProduitsSet = useMemo(
    () => new Set(dispos?.indisponiblesProduits ?? []),
    [dispos],
  );

  const [cameraOuverte, setCameraOuverte] = useState(false);
  const scanRef = useRef<BarreScanHandle>(null);
  const { scanner, scanEnCours } = useScanProduit({
    produits,
    indisponiblesVariantes: indispoVariantesSet,
    indisponiblesProduits: indispoProduitsSet,
    onProduitTrouve: (p, v) => {
      // Fix m6 : montre la quantite resultante apres scan repete. Le caissier
      // sait visuellement combien d'exemplaires il a deja saisis sans avoir
      // a chercher dans le panier (utile pour ventes par lot).
      const existant = panier.articles.find((a) => a.varianteId === v.id);
      const qApres = (existant?.quantite ?? 0) + 1;
      panier.ajouter(p, v);
      const suffixe = qApres > 1 ? ` · ×${qApres}` : "";
      toast.success(`${p.nom}${v.nom ? ` · ${v.nom}` : ""} ajoute${suffixe}`);
    },
  });
  // Index de la ligne en cours de personnalisation (suppléments). null = ferme.
  const [ligneSupplements, setLigneSupplements] = useState<number | null>(null);
  const articleEnCours = ligneSupplements !== null ? panier.articles[ligneSupplements] : undefined;
  // Cible de la modale remise : "ticket" pour la remise globale, ou un index de ligne.
  const [cibleRemise, setCibleRemise] = useState<number | "ticket" | null>(null);
  const articleRemise = typeof cibleRemise === "number" ? panier.articles[cibleRemise] : null;
  const [modalClientOuvert, setModalClientOuvert] = useState(false);
  const [apercuOuvert, setApercuOuvert] = useState(false);

  function ouvrirSupplements(indexLigne: number) {
    setLigneSupplements(indexLigne);
  }
  function confirmerSupplements(supplements: typeof panier.articles[number]["supplements"]) {
    if (ligneSupplements !== null) {
      panier.definirSupplementsLigne(ligneSupplements, supplements);
    }
    setLigneSupplements(null);
  }

  async function lancerEncaissement(paiements: { methode: string; montant: number }[]) {
    await encaissement.encaisser(paiements);
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

  // Garde session caisse : tant que rien n'est ouvert sur l'emplacement
  // courant, on bloque la vente et on demande au caissier d'ouvrir la caisse
  // (declarer le fond initial).
  if (empId && !chargementSession && !sessionActive) {
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="flex-1 flex flex-col bg-surface-secondary overflow-y-auto">
          <header className="flex items-center justify-between gap-2 px-3 sm:px-4 border-b border-border bg-surface shrink-0 safe-top">
            <div className="h-14 flex items-center gap-2 min-w-0">
              <ShoppingCart size={18} className="text-accent shrink-0" />
              <span className="font-semibold text-foreground text-sm sm:text-base">Caisse</span>
              <Chip className="bg-warning/10 text-warning text-[10px] gap-1 ml-1">
                <Lock size={10} /> Fermee
              </Chip>
            </div>
            {(emplacementsCaisse ?? []).length > 1 && (
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
                    {emplacementsCaisse.map((e) => (
                      <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>
                        {e.nom}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          </header>
          <FormulaireOuvertureCaisse
            emplacementId={empId}
            emplacementNom={empCourant?.nom ?? "Emplacement"}
          />
        </div>
      </div>
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
            {(emplacementsCaisse ?? []).length > 0 && (
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
                    {emplacementsCaisse.map((e) => (
                      <ListBox.Item key={e.id} id={e.id} textValue={e.nom}>
                        {e.nom}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
            {sessionActive && (
              <Button
                variant="outline"
                className="h-9 px-3 gap-1.5 text-xs text-danger border-danger/30 hover:bg-danger/5"
                onPress={() => setModalFermetureOuvert(true)}
              >
                <Lock size={14} strokeWidth={2} />
                <span className="hidden sm:inline">Fermer la caisse</span>
              </Button>
            )}
          </div>
        </header>

        {/* Module 13 D3 : alerte si ni WebUSB ni WebBluetooth disponibles */}
        <BanniereCompatMateriel />

        <div className="px-3 sm:px-4 py-2 border-b border-border bg-surface">
          <BarreScan
            scanRef={scanRef}
            onScan={scanner}
            scanEnCours={scanEnCours}
            onOuvrirCamera={() => setCameraOuverte(true)}
            className="max-w-md"
          />
        </div>

        <div className="flex-1 overflow-hidden flex flex-col pb-20 lg:pb-0">
          <GrilleProduits
            produits={produits}
            stocks={stocks}
            disponibilites={dispos}
            onAjouter={saisieQuantite.ajouterDepuisGrille}
          />
        </div>
      </div>

      {/* Panier en colonne fixe — desktop uniquement */}
      <div className="hidden lg:flex">
        <PanierVente
          mode="lateral"
          articles={panier.articles}
          sousTotal={panier.sousTotal}
          total={panier.total}
          nombreArticles={panier.nombreArticles}
          remiseGlobale={panier.remiseGlobale}
          note={panier.note}
          client={panier.client}
          onModifierQuantite={panier.modifierQuantite}
          onDefinirQuantite={panier.definirQuantite}
          onRetirer={panier.retirer}
          onVider={panier.vider}
          onEncaisser={() => setPaiementOuvert(true)}
          onAttente={lancerMiseEnAttente}
          onSaisirQuantite={saisieQuantite.ouvrirPourLigne}
          onPersonnaliser={ouvrirSupplements}
          onAppliquerRemiseLigne={(i) => setCibleRemise(i)}
          onAppliquerRemiseGlobale={() => setCibleRemise("ticket")}
          onRetirerRemiseGlobale={() => panier.definirRemiseGlobale(null)}
          onAppliquerCodePromo={(montant, code) => panier.definirRemiseGlobale({
            type: "MONTANT", valeur: montant, raison: `PROMO:${code}`,
          })}
          onModifierNote={panier.definirNote}
          onChoisirClient={() => setModalClientOuvert(true)}
          onApercu={() => setApercuOuvert(true)}
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
              sousTotal={panier.sousTotal}
              total={panier.total}
              nombreArticles={panier.nombreArticles}
              remiseGlobale={panier.remiseGlobale}
              note={panier.note}
              client={panier.client}
              onModifierQuantite={panier.modifierQuantite}
              onDefinirQuantite={panier.definirQuantite}
              onRetirer={panier.retirer}
              onVider={panier.vider}
              onEncaisser={ouvrirEncaissement}
              onAttente={lancerMiseEnAttente}
              onSaisirQuantite={saisieQuantite.ouvrirPourLigne}
              onPersonnaliser={ouvrirSupplements}
              onAppliquerRemiseLigne={(i) => setCibleRemise(i)}
              onAppliquerRemiseGlobale={() => setCibleRemise("ticket")}
              onRetirerRemiseGlobale={() => panier.definirRemiseGlobale(null)}
              onModifierNote={panier.definirNote}
              onChoisirClient={() => setModalClientOuvert(true)}
              onApercu={() => setApercuOuvert(true)}
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
                clientId={panier.client?.id}
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
          numeroSession={sessionActive?.numeroSession}
          origineOffline={encaissement.derniereVente.origineOffline}
          /* Module 15 D2 : emplacement courant pour le footer ticket personnalise */
          emplacementId={empId}
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
          indisponibles={dispos?.indisponiblesProduits}
          onConfirmer={confirmerSupplements}
          onFermer={() => setLigneSupplements(null)}
        />
      )}

      <ModalFermetureCaisse
        ouvert={modalFermetureOuvert}
        sessionId={sessionActive?.id ?? null}
        onFermer={() => setModalFermetureOuvert(false)}
      />

      <ModalScannerCamera
        ouvert={cameraOuverte}
        onFermer={() => {
          setCameraOuverte(false);
          // Fix I9 : ramener le focus sur la barre de scan apres fermeture
          // de la modale camera pour que la douchette ne tape pas dans le vide.
          setTimeout(() => scanRef.current?.focus(), 100);
        }}
        onScan={(code) => { setCameraOuverte(false); scanner(code); }}
      />

      <ModalClientPanier
        ouvert={modalClientOuvert}
        clientCourant={panier.client}
        onConfirmer={panier.definirClient}
        onFermer={() => setModalClientOuvert(false)}
      />

      <ModalApercuTicket
        ouvert={apercuOuvert}
        onFermer={() => setApercuOuvert(false)}
        articles={panier.articles}
        sousTotal={panier.sousTotal}
        total={panier.total}
        remiseGlobale={panier.remiseGlobale}
        note={panier.note}
        client={panier.client}
        emplacementNom={empCourant?.nom ?? "Emplacement"}
        caissierNom={`${utilisateur?.prenom ?? ""} ${utilisateur?.nomFamille ?? ""}`.trim() || "—"}
        numeroSession={sessionActive?.numeroSession}
      />

      <ModalRemise
        ouvert={cibleRemise !== null}
        onFermer={() => setCibleRemise(null)}
        cible={
          cibleRemise === "ticket"
            ? "le ticket entier"
            : articleRemise?.nomProduit ?? ""
        }
        sousTotal={
          cibleRemise === "ticket"
            ? panier.sousTotal
            : articleRemise
              ? articleRemise.prixUnitaire * articleRemise.quantite
                + (articleRemise.supplements ?? []).reduce((s, sup) => s + sup.prixUnitaire * sup.quantite, 0)
              : 0
        }
        remiseCourante={
          cibleRemise === "ticket"
            ? panier.remiseGlobale
            : articleRemise?.remise ?? null
        }
        onConfirmer={(r) => {
          if (cibleRemise === "ticket") {
            panier.definirRemiseGlobale(r);
          } else if (typeof cibleRemise === "number") {
            panier.definirRemiseLigne(cibleRemise, r);
          }
        }}
        onRetirer={() => {
          if (cibleRemise === "ticket") {
            panier.definirRemiseGlobale(null);
          } else if (typeof cibleRemise === "number") {
            panier.definirRemiseLigne(cibleRemise, null);
          }
        }}
      />
    </div>
  );
}
