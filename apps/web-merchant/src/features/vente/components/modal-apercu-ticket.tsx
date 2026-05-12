"use client";

import { Modal, Button } from "@heroui/react";
import { Eye, Printer } from "lucide-react";
import type { ArticlePanier, Remise, ClientPanier } from "../hooks/usePanier";
import { formatMontant, formatHeure, formatDateRelative } from "../utils/format";
import { imprimerTicket } from "../utils/imprimer-ticket";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ITicket } from "../types/vente.type";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  articles: ArticlePanier[];
  sousTotal: number;
  total: number;
  remiseGlobale: Remise | null;
  note: string;
  client: ClientPanier | null;
  emplacementNom: string;
  caissierNom: string;
  /** Numero de session pour la tracabilite. */
  numeroSession?: string;
}

/**
 * Apercu visuel du ticket avant impression. Reproduit le format ticket de
 * caisse 80mm en HTML responsive. Sera reutilise par window.print() en
 * Phase 2.4 avec un stylesheet print-only.
 */
export function ModalApercuTicket({
  ouvert, onFermer, articles, sousTotal, total, remiseGlobale, note, client,
  emplacementNom, caissierNom, numeroSession,
}: Props) {
  const { boutiqueActive } = useAuth();
  const aRemise = !!remiseGlobale && remiseGlobale.montant > 0;
  const maintenant = new Date().toISOString();

  async function imprimerApercu() {
    if (!boutiqueActive) return;
    // Construit un "ticket fictif" depuis l'etat du panier pour reutiliser
    // imprimerTicket(). Pas de paiements car la vente n'est pas encore validee.
    const ticketFictif: ITicket = {
      id: "preview",
      numeroTicket: "(à venir)",
      statut: "OPEN",
      sousTotal,
      montantTva: 0,
      montantRemise: aRemise ? remiseGlobale!.montant : 0,
      total,
      nomClient: client?.nom,
      telephoneClient: client?.telephone,
      note: note || undefined,
      lignes: articles.map((a, i) => ({
        id: `tmp-${i}`,
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
        supplements: a.supplements,
      })),
      paiements: [],
      creeLe: maintenant,
    };
    await imprimerTicket(
      ticketFictif,
      { nom: emplacementNom || boutiqueActive.nom, devise: boutiqueActive.devise },
      0,
      { caissier: caissierNom, numeroSession },
    );
  }

  return (
    <Modal.Backdrop isOpen={ouvert} onOpenChange={(o) => { if (!o) onFermer(); }}>
      <Modal.Container size="sm" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-muted/10 text-muted">
              <Eye className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Aperçu du ticket</Modal.Heading>
          </Modal.Header>

          <Modal.Body>
            {/* Ticket : police mono pour matcher l'aspect imprimante thermique */}
            <div className="bg-white text-black p-4 rounded-md font-mono text-xs leading-tight space-y-2 border border-border">
              {/* Entete */}
              <div className="text-center space-y-0.5">
                <p className="font-bold text-sm uppercase">{emplacementNom}</p>
                <p className="text-[10px]">
                  {formatDateRelative(maintenant)} · {formatHeure(maintenant)}
                </p>
                <p className="text-[10px]">Caissier : {caissierNom}</p>
                {numeroSession && (
                  <p className="text-[10px]">Session : {numeroSession}</p>
                )}
              </div>

              <div className="border-t border-dashed border-black/30" />

              {/* Client + Note */}
              {(client || note) && (
                <>
                  <div className="text-[11px] space-y-0.5">
                    {client && (
                      <p>
                        <span className="font-semibold">Client :</span>{" "}
                        {client.nom ?? client.telephone ?? "—"}
                        {client.telephone && client.nom && ` · ${client.telephone}`}
                      </p>
                    )}
                    {note && (
                      <p><span className="font-semibold">Note :</span> {note}</p>
                    )}
                  </div>
                  <div className="border-t border-dashed border-black/30" />
                </>
              )}

              {/* Lignes */}
              <ul className="space-y-1.5 text-[11px]">
                {articles.map((a, i) => {
                  const sousTotalLigne = a.prixUnitaire * a.quantite
                    + a.supplements.reduce((s, sup) => s + sup.prixUnitaire * sup.quantite, 0);
                  return (
                    <li key={`${a.varianteId}-${i}`}>
                      <div className="flex justify-between gap-2">
                        <span className="flex-1 min-w-0">
                          {a.quantite} × {a.nomProduit}
                        </span>
                        <span className="tabular-nums">{formatMontant(sousTotalLigne)}</span>
                      </div>
                      {a.supplements.length > 0 && (
                        <ul className="pl-3 text-[10px] text-black/70 space-y-0.5">
                          {a.supplements.map((s) => (
                            <li key={s.supplementId} className="flex justify-between">
                              <span>+ {s.nom}{s.quantite > 1 && ` ×${s.quantite}`}</span>
                              <span className="tabular-nums">{formatMontant(s.prixUnitaire * s.quantite)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {a.remise && (
                        <div className="flex justify-between text-[10px] pl-3 italic">
                          <span>Remise{a.remise.type === "POURCENTAGE" && ` ${a.remise.valeurOriginale}%`}</span>
                          <span className="tabular-nums">- {formatMontant(a.remise.montant)}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-dashed border-black/30" />

              {/* Totaux */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span className="tabular-nums">{formatMontant(sousTotal)} F</span>
                </div>
                {aRemise && (
                  <div className="flex justify-between italic">
                    <span>
                      Remise ticket
                      {remiseGlobale!.raison && ` (${remiseGlobale!.raison})`}
                    </span>
                    <span className="tabular-nums">- {formatMontant(remiseGlobale!.montant)} F</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1">
                  <span>TOTAL</span>
                  <span className="tabular-nums">{formatMontant(total)} F</span>
                </div>
              </div>

              <div className="border-t border-dashed border-black/30" />

              <p className="text-center text-[10px]">Merci de votre visite !</p>
            </div>

            <p className="text-[10px] text-muted text-center mt-3">
              Aperçu indicatif — le ticket final sera généré à l'encaissement
            </p>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" className="mr-auto" slot="close">Fermer</Button>
            <Button
              variant="primary"
              className="gap-2"
              onPress={imprimerApercu}
              isDisabled={articles.length === 0}
            >
              <Printer size={14} /> Imprimer
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
