"use client";

import { useEffect, useState } from "react";
import { Button, Card, Switch, toast } from "@heroui/react";
import { Printer, Plug, CheckCircle2, AlertCircle, Unplug } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  appairerImprimante, retrouverImprimante, oublierImprimante,
  envoyerCommandes, decrireImprimante, supporteWebUsb,
  type DeviceUSB,
} from "@/lib/imprimante-thermique";
import { preferencesPOS, usePreferencesPOS } from "@/lib/preferences-pos";
import { genererTicketEscPos } from "@/lib/imprimante-thermique";
import type { ITicket } from "@/features/vente/types/vente.type";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function PageImprimante() {
  const supporte = supporteWebUsb();
  const prefs = usePreferencesPOS();
  const { boutiqueActive, utilisateur } = useAuth();
  const [device, setDevice] = useState<DeviceUSB | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!supporte) { setChargement(false); return; }
    retrouverImprimante().then((d) => {
      setDevice(d);
      setChargement(false);
    }).catch(() => setChargement(false));
  }, [supporte]);

  async function connecter() {
    try {
      setEnCours(true);
      const d = await appairerImprimante();
      setDevice(d);
      toast.success("Imprimante connectee");
    } catch (err) {
      // L'utilisateur a annule la dialog : pas une vraie erreur.
      const msg = err instanceof Error ? err.message : "Erreur de connexion";
      if (!/no device selected|user cancel/i.test(msg)) toast.danger(msg);
    } finally {
      setEnCours(false);
    }
  }

  function deconnecter() {
    oublierImprimante();
    setDevice(null);
    toast.success("Imprimante deconnectee");
  }

  async function tester() {
    if (!device || !boutiqueActive) return;
    setEnCours(true);
    try {
      const ticketTest: ITicket = {
        id: "test",
        numeroTicket: "TEST",
        statut: "COMPLETED",
        sousTotal: 1500,
        montantTva: 0,
        montantRemise: 0,
        total: 1500,
        nomClient: "Test client",
        lignes: [
          {
            id: "tl1",
            varianteId: "v1",
            nomProduit: "Article de test",
            nomVariante: "Standard",
            sku: "TEST-001",
            quantite: 1,
            prixUnitaire: 1500,
            remise: 0,
            tauxTva: 0,
            montantTva: 0,
            totalLigne: 1500,
            supplements: [],
          },
        ],
        paiements: [{ id: "p1", methode: "CASH", montant: 2000 }],
        creeLe: new Date().toISOString(),
      };
      const caissier = `${utilisateur?.prenom ?? ""} ${utilisateur?.nomFamille ?? ""}`.trim();
      const data = genererTicketEscPos(
        ticketTest,
        { nom: boutiqueActive.nom, devise: boutiqueActive.devise },
        500,
        { caissier: caissier || undefined },
      );
      await envoyerCommandes(device, data);
      toast.success("Ticket de test envoye");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Echec d'impression");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        titre="Imprimante de tickets"
        description="Imprimante thermique 80mm (USB) pour impression directe sans dialog."
      />

      {!supporte ? (
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                <AlertCircle size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Navigateur non compatible</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  L&apos;impression directe (WebUSB) est disponible sur Chrome, Edge et Brave.
                  Sur Safari ou Firefox, l&apos;app passe automatiquement par la dialog d&apos;impression
                  classique du navigateur.
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <Card.Content className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  device ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
                }`}>
                  {device ? <CheckCircle2 size={18} /> : <Printer size={18} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {device ? "Imprimante connectee" : "Aucune imprimante connectee"}
                  </p>
                  {device && (
                    <p className="text-xs text-muted mt-1 break-words">
                      {decrireImprimante(device)}
                    </p>
                  )}
                  {!device && (
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Branchez votre imprimante USB et cliquez sur Connecter. Le navigateur
                      ouvrira une dialog pour la selectionner.
                    </p>
                  )}
                </div>
              </div>
              {chargement ? (
                <div className="h-9 bg-muted/10 rounded animate-pulse" />
              ) : device ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onPress={tester} isDisabled={enCours} className="gap-2">
                    <Printer size={14} /> Imprimer un test
                  </Button>
                  <Button variant="outline" onPress={deconnecter} isDisabled={enCours} className="gap-2 text-danger border-danger/30">
                    <Unplug size={14} /> Oublier
                  </Button>
                </div>
              ) : (
                <Button variant="primary" onPress={connecter} isDisabled={enCours} className="gap-2">
                  <Plug size={14} /> Connecter
                </Button>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="p-5">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Printer size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Impression automatique</p>
                      <p className="text-xs text-muted mt-1 leading-relaxed">
                        Imprime le ticket des qu&apos;une vente est encaissee, sans intervention
                        du caissier.
                      </p>
                    </div>
                    <Switch
                      isSelected={prefs.imprimerAuto}
                      onChange={() => preferencesPOS.modifier({ imprimerAuto: !prefs.imprimerAuto })}
                      aria-label="Activer l'impression automatique"
                    >
                      <Switch.Control><Switch.Thumb /></Switch.Control>
                    </Switch>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
