"use client";

import { useEffect, useState } from "react";
import { Button, Card, Switch, toast, Tabs } from "@heroui/react";
import {
  Printer, Plug, CheckCircle2, AlertCircle, Unplug, Bluetooth, Usb,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  appairerImprimante, retrouverImprimante, oublierImprimante,
  envoyerCommandes, decrireImprimante, supporteWebUsb,
  appairerImprimanteBT, oublierImprimanteBT, supporteWebBluetooth,
  decrireImprimanteBT, envoyerCommandesBT, nomDeviceBT, imprimanteBTConnue,
  genererTicketEscPos,
  type DeviceUSB, type DeviceBluetooth,
} from "@/lib/escpos";
import { preferencesPOS, usePreferencesPOS } from "@/lib/preferences-pos";
import { construireTicketTest } from "@/lib/ticket-test";
import { useAuth } from "@/features/auth/hooks/useAuth";

type Transport = "usb" | "bluetooth";

export default function PageImprimante() {
  const supportUsb = supporteWebUsb();
  const supportBT = supporteWebBluetooth();
  const prefs = usePreferencesPOS();
  const { boutiqueActive, utilisateur } = useAuth();

  // Onglet courant : Bluetooth par defaut sur mobile (pas WebUSB), USB sinon
  const [transport, setTransport] = useState<Transport>(() => {
    if (typeof window === "undefined") return "usb";
    return !supportUsb && supportBT ? "bluetooth" : "usb";
  });

  // ─── USB ──────────────────────────────────────────────────────────────
  const [deviceUsb, setDeviceUsb] = useState<DeviceUSB | null>(null);
  const [chargementUsb, setChargementUsb] = useState(true);
  const [enCoursUsb, setEnCoursUsb] = useState(false);
  const [modeAvanceUsb, setModeAvanceUsb] = useState(false);

  useEffect(() => {
    if (!supportUsb) { setChargementUsb(false); return; }
    retrouverImprimante().then((d) => {
      setDeviceUsb(d);
      setChargementUsb(false);
    }).catch(() => setChargementUsb(false));
  }, [supportUsb]);

  async function connecterUsb() {
    try {
      setEnCoursUsb(true);
      const d = await appairerImprimante(modeAvanceUsb);
      setDeviceUsb(d);
      toast.success("Imprimante USB connectee");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur de connexion";
      if (!/no device selected|user cancel/i.test(msg)) toast.danger(msg);
    } finally {
      setEnCoursUsb(false);
    }
  }

  function deconnecterUsb() {
    oublierImprimante();
    setDeviceUsb(null);
    toast.success("Imprimante USB deconnectee");
  }

  async function testerUsb() {
    if (!deviceUsb || !boutiqueActive) return;
    setEnCoursUsb(true);
    try {
      const caissier = `${utilisateur?.prenom ?? ""} ${utilisateur?.nomFamille ?? ""}`.trim();
      const data = genererTicketEscPos(
        construireTicketTest(),
        { nom: boutiqueActive.nom, devise: boutiqueActive.devise },
        500,
        { caissier: caissier || undefined },
      );
      await envoyerCommandes(deviceUsb, data);
      toast.success("Ticket de test envoye");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Echec d'impression");
    } finally {
      setEnCoursUsb(false);
    }
  }

  // ─── Bluetooth ────────────────────────────────────────────────────────
  const [deviceBT, setDeviceBT] = useState<DeviceBluetooth | null>(null);
  const [nomBT, setNomBT] = useState<string | null>(null);
  const [enCoursBT, setEnCoursBT] = useState(false);
  const [modeAvanceBT, setModeAvanceBT] = useState(false);

  useEffect(() => {
    setNomBT(nomDeviceBT());
  }, []);

  async function connecterBT() {
    try {
      setEnCoursBT(true);
      const d = await appairerImprimanteBT(modeAvanceBT);
      setDeviceBT(d);
      setNomBT(d.name ?? "Bluetooth");
      toast.success("Imprimante Bluetooth appairee");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur de connexion";
      if (!/no device selected|user cancel/i.test(msg)) toast.danger(msg);
    } finally {
      setEnCoursBT(false);
    }
  }

  function deconnecterBT() {
    oublierImprimanteBT();
    setDeviceBT(null);
    setNomBT(null);
    toast.success("Imprimante Bluetooth deconnectee");
  }

  async function testerBT() {
    if (!deviceBT || !boutiqueActive) return;
    setEnCoursBT(true);
    try {
      const caissier = `${utilisateur?.prenom ?? ""} ${utilisateur?.nomFamille ?? ""}`.trim();
      const data = genererTicketEscPos(
        construireTicketTest(),
        { nom: boutiqueActive.nom, devise: boutiqueActive.devise },
        500,
        { caissier: caissier || undefined },
      );
      await envoyerCommandesBT(deviceBT, data);
      toast.success("Ticket de test envoye");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Echec d'impression");
    } finally {
      setEnCoursBT(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────

  if (!supportUsb && !supportBT) {
    return (
      <PageContainer>
        <PageHeader
          titre="Imprimante de tickets"
          description="Connexion directe a une imprimante thermique (USB ou Bluetooth)."
        />
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                <AlertCircle size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Impression directe indisponible</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Ce navigateur ne supporte ni WebUSB ni Web Bluetooth.
                  L&apos;app utilisera la dialog d&apos;impression classique du
                  navigateur. Pour l&apos;impression directe sans dialog,
                  utilisez Chrome, Edge ou Brave.
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titre="Imprimante de tickets"
        description="Connexion directe a une imprimante thermique 80mm. USB pour les boutiques fixes, Bluetooth pour les camions et tablettes mobiles."
      />

      <Tabs selectedKey={transport} onSelectionChange={(k) => setTransport(String(k) as Transport)} aria-label="Type d'imprimante">
        <Tabs.List className="mb-4">
          <Tabs.Tab id="usb" className="gap-2" isDisabled={!supportUsb}>
            <span className="inline-flex items-center gap-1.5">
              <Usb size={14} /> USB
              {!supportUsb && <span className="text-[10px] text-muted">(indispo)</span>}
            </span>
          </Tabs.Tab>
          <Tabs.Tab id="bluetooth" className="gap-2" isDisabled={!supportBT}>
            <span className="inline-flex items-center gap-1.5">
              <Bluetooth size={14} /> Bluetooth
              {!supportBT && <span className="text-[10px] text-muted">(indispo)</span>}
            </span>
          </Tabs.Tab>
        </Tabs.List>

        {/* ── USB ─────────────────────────────────────────────────────── */}
        <Tabs.Panel id="usb">
          {supportUsb ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card>
                <Card.Content className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      deviceUsb ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
                    }`}>
                      {deviceUsb ? <CheckCircle2 size={18} /> : <Printer size={18} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {deviceUsb ? "Imprimante USB connectee" : "Aucune imprimante USB"}
                      </p>
                      {deviceUsb && (
                        <p className="text-xs text-muted mt-1 break-words">
                          {decrireImprimante(deviceUsb)}
                        </p>
                      )}
                      {!deviceUsb && (
                        <p className="text-xs text-muted mt-1 leading-relaxed">
                          Branchez votre imprimante USB et cliquez sur Connecter.
                        </p>
                      )}
                    </div>
                  </div>
                  {chargementUsb ? (
                    <div className="h-9 bg-muted/10 rounded animate-pulse" />
                  ) : deviceUsb ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="primary" onPress={testerUsb} isDisabled={enCoursUsb} className="gap-2">
                        <Printer size={14} /> Imprimer un test
                      </Button>
                      <Button variant="outline" onPress={deconnecterUsb} isDisabled={enCoursUsb} className="gap-2 text-danger border-danger/30">
                        <Unplug size={14} /> Oublier
                      </Button>
                    </div>
                  ) : (
                    <Button variant="primary" onPress={connecterUsb} isDisabled={enCoursUsb} className="gap-2">
                      <Plug size={14} /> Connecter
                    </Button>
                  )}
                </Card.Content>
              </Card>

              <Card>
                <Card.Content className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                      <AlertCircle size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Mode avance</p>
                          <p className="text-xs text-muted mt-1 leading-relaxed">
                            Affiche tous les peripheriques USB.
                            A activer uniquement si votre imprimante n&apos;apparait pas.
                          </p>
                        </div>
                        <Switch
                          isSelected={modeAvanceUsb}
                          onChange={() => setModeAvanceUsb((v) => !v)}
                          aria-label="Mode avance USB"
                        >
                          <Switch.Control><Switch.Thumb /></Switch.Control>
                        </Switch>
                      </div>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </div>
          ) : (
            <Card>
              <Card.Content className="p-6">
                <p className="text-sm text-muted text-center">
                  WebUSB indisponible sur ce navigateur. Utilisez l&apos;onglet Bluetooth.
                </p>
              </Card.Content>
            </Card>
          )}
        </Tabs.Panel>

        {/* ── Bluetooth ───────────────────────────────────────────────── */}
        <Tabs.Panel id="bluetooth">
          {supportBT ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card>
                <Card.Content className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      deviceBT ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
                    }`}>
                      {deviceBT ? <CheckCircle2 size={18} /> : <Bluetooth size={18} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {deviceBT
                          ? "Imprimante Bluetooth connectee"
                          : nomBT
                          ? `Derniere imprimante : ${nomBT}`
                          : "Aucune imprimante Bluetooth"}
                      </p>
                      {deviceBT && (
                        <p className="text-xs text-muted mt-1 break-words">
                          {decrireImprimanteBT(deviceBT)}
                        </p>
                      )}
                      {!deviceBT && (
                        <p className="text-xs text-muted mt-1 leading-relaxed">
                          {nomBT
                            ? "L'appairage est memorise. Cliquez sur Connecter pour la retrouver."
                            : "Allumez votre imprimante BT et cliquez sur Connecter."}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deviceBT ? (
                      <>
                        <Button variant="primary" onPress={testerBT} isDisabled={enCoursBT} className="gap-2">
                          <Printer size={14} /> Imprimer un test
                        </Button>
                        <Button variant="outline" onPress={deconnecterBT} isDisabled={enCoursBT} className="gap-2 text-danger border-danger/30">
                          <Unplug size={14} /> Oublier
                        </Button>
                      </>
                    ) : (
                      <Button variant="primary" onPress={connecterBT} isDisabled={enCoursBT} className="gap-2">
                        <Bluetooth size={14} /> Connecter
                      </Button>
                    )}
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Content className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                      <AlertCircle size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Mode avance</p>
                          <p className="text-xs text-muted mt-1 leading-relaxed">
                            Affiche tous les peripheriques BLE.
                            A activer si votre imprimante n&apos;est pas listee
                            par defaut (modeles exotiques).
                          </p>
                        </div>
                        <Switch
                          isSelected={modeAvanceBT}
                          onChange={() => setModeAvanceBT((v) => !v)}
                          aria-label="Mode avance Bluetooth"
                        >
                          <Switch.Control><Switch.Thumb /></Switch.Control>
                        </Switch>
                      </div>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </div>
          ) : (
            <Card>
              <Card.Content className="p-6">
                <p className="text-sm text-muted text-center">
                  Web Bluetooth indisponible sur ce navigateur. Utilisez l&apos;onglet USB ou Chrome sur Android.
                </p>
              </Card.Content>
            </Card>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Impression automatique : commune aux deux transports */}
      <Card className="mt-3">
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
                    Imprime le ticket des qu&apos;une vente est encaissee.
                    S&apos;applique au transport actif (USB ou Bluetooth).
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
    </PageContainer>
  );
}
