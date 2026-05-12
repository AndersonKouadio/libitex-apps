"use client";

import { Card, Chip, Skeleton, Table } from "@heroui/react";
import {
  MessageCircle, Mail, CheckCircle2, XCircle, AlertCircle, Receipt,
  Calendar, BellRing, ClipboardList, Tag, Package, Lock,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/empty-states/empty-state";
import {
  useNotificationListQuery, useStatutProvidersQuery,
} from "@/features/notifications/queries/notification.query";
import type {
  INotificationLog, TypeNotification, StatutNotification, CanalNotification,
} from "@/features/notifications/types/notification.type";

const LIBELLE_TYPE: Record<TypeNotification, string> = {
  ticket: "Ticket",
  reservation_created: "Reservation creee",
  reservation_reminder: "Rappel reservation",
  reservation_status: "Statut reservation",
  purchase_order: "Bon de commande",
  promo: "Code promo",
  stock_alert: "Alerte stock",
  otp: "Code de verification",
};

const ICONE_TYPE: Record<TypeNotification, typeof Receipt> = {
  ticket: Receipt,
  reservation_created: Calendar,
  reservation_reminder: BellRing,
  reservation_status: Calendar,
  purchase_order: ClipboardList,
  promo: Tag,
  stock_alert: Package,
  otp: Lock,
};

const LIBELLE_STATUT: Record<StatutNotification, string> = {
  pending: "En attente",
  sent: "Envoye",
  delivered: "Distribue",
  read: "Lu",
  failed: "Echoue",
};

const CLASSES_STATUT: Record<StatutNotification, string> = {
  pending: "bg-warning/10 text-warning",
  sent: "bg-accent/10 text-accent",
  delivered: "bg-success/10 text-success",
  read: "bg-success/10 text-success",
  failed: "bg-danger/10 text-danger",
};

const ICONE_CANAL: Record<CanalNotification, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  email: Mail,
  sms: MessageCircle,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function masquerTelephone(tel: string): string {
  // +2250712345678 -> +225 07 ** ** 78
  const clean = tel.replace(/\D/g, "");
  if (clean.length < 6) return tel;
  return `${tel.slice(0, -6)}** ** ${tel.slice(-2)}`;
}

export default function PageNotifications() {
  const { data: status, isLoading: statusChargement } = useStatutProvidersQuery();
  const { data: logs, isLoading: logsChargement } = useNotificationListQuery({ limit: 50 });

  return (
    <PageContainer>
      <PageHeader
        titre="Notifications WhatsApp"
        description="Etat des connexions et historique des envois aux clients et fournisseurs."
      />

      {/* Etat des providers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {statusChargement || !status ? (
          <>
            <Skeleton className="h-[88px] rounded-xl" />
            <Skeleton className="h-[88px] rounded-xl" />
          </>
        ) : (
          <>
            <CarteStatut
              icone={MessageCircle}
              libelle="WhatsApp Meta"
              detail={status.whatsapp.provider}
              disponible={status.whatsapp.disponible}
            />
            <CarteStatut
              icone={Mail}
              libelle="Email SMTP"
              detail={status.email.provider}
              disponible={status.email.disponible}
            />
          </>
        )}
      </div>

      {!statusChargement && status && !status.whatsapp.disponible && (
        <div className="mb-6 p-4 rounded-xl border border-warning/30 bg-warning/5 flex items-start gap-3">
          <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-foreground font-medium">
              WhatsApp Meta n&apos;est pas configure
            </p>
            <p className="text-muted mt-1 leading-relaxed">
              Les notifications sont envoyees en mode log (visibles ici avec
              <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted/10 mx-1">provider_message_id</code>
              prefixe par <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted/10">dev:</code>).
              Configurez <code className="font-mono text-xs">WHATSAPP_TOKEN</code> et
              <code className="font-mono text-xs ml-1">WHATSAPP_PHONE_ID</code> dans
              <code className="font-mono text-xs ml-1">.env</code> pour activer les vrais envois.
            </p>
          </div>
        </div>
      )}

      {/* Historique */}
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
        Historique des envois ({logs?.length ?? 0})
      </h3>

      {logsChargement ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : (logs?.length ?? 0) === 0 ? (
        <EmptyState
          icone={MessageCircle}
          titre="Aucune notification envoyee"
          description="Les envois apparaitront ici a chaque ticket / reservation / bon de commande."
        />
      ) : (
        <Card>
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Historique notifications">
                <Table.Header className="table-header-libitex">
                  <Table.Column className="w-10"> </Table.Column>
                  <Table.Column isRowHeader>Type</Table.Column>
                  <Table.Column>Destinataire</Table.Column>
                  <Table.Column>Statut</Table.Column>
                  <Table.Column>Date</Table.Column>
                </Table.Header>
                <Table.Body>
                  {(logs ?? []).map((log) => <LigneLog key={log.id} log={log} />)}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card>
      )}
    </PageContainer>
  );
}

interface CarteStatutProps {
  icone: typeof MessageCircle;
  libelle: string;
  detail: string;
  disponible: boolean;
}

function CarteStatut({ icone: Icone, libelle, detail, disponible }: CarteStatutProps) {
  return (
    <Card>
      <Card.Content className="p-4">
        <div className="flex items-start gap-3">
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            disponible ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
          }`}>
            <Icone size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{libelle}</p>
              {disponible ? (
                <CheckCircle2 size={14} className="text-success" />
              ) : (
                <XCircle size={14} className="text-muted/50" />
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">{detail}</p>
            <p className="text-xs mt-1.5">
              <span className={disponible ? "text-success" : "text-muted"}>
                {disponible ? "Configure et actif" : "Non configure (mode log)"}
              </span>
            </p>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}

function LigneLog({ log }: { log: INotificationLog }) {
  const Icone = ICONE_TYPE[log.type] ?? MessageCircle;
  const IconeCanal = ICONE_CANAL[log.channel] ?? MessageCircle;
  return (
    <Table.Row>
      <Table.Cell>
        <IconeCanal size={14} className="text-muted" />
      </Table.Cell>
      <Table.Cell>
        <div className="flex items-center gap-2">
          <Icone size={14} className="text-muted shrink-0" />
          <span className="text-sm">{LIBELLE_TYPE[log.type] ?? log.type}</span>
        </div>
      </Table.Cell>
      <Table.Cell className="text-xs text-muted font-mono">
        {masquerTelephone(log.recipient)}
      </Table.Cell>
      <Table.Cell>
        <Chip className={`text-[10px] ${CLASSES_STATUT[log.status]}`}>
          {LIBELLE_STATUT[log.status] ?? log.status}
        </Chip>
        {log.error && (
          <p className="text-[10px] text-danger mt-0.5 truncate max-w-[200px]" title={log.error}>
            {log.error}
          </p>
        )}
      </Table.Cell>
      <Table.Cell className="text-xs text-muted">
        {formatDate(log.sentAt ?? log.createdAt)}
      </Table.Cell>
    </Table.Row>
  );
}
