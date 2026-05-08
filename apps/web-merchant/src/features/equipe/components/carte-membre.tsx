"use client";

import { Card, Chip, Button, Avatar } from "@heroui/react";
import { Crown, MapPin, Settings, UserMinus, Mail, Phone } from "lucide-react";
import type { IMembre, RoleMembre } from "../types/equipe.type";
import { ROLES_LABELS } from "../types/equipe.type";
import type { IEmplacement } from "@/features/stock/types/stock.type";

const ROLE_VARIANTES: Record<RoleMembre, string> = {
  SUPER_ADMIN: "bg-danger/10 text-danger",
  ADMIN: "bg-accent/10 text-accent",
  MANAGER: "bg-warning/10 text-warning",
  COMMERCIAL: "bg-success/10 text-success",
  CASHIER: "bg-muted/10 text-muted",
  WAREHOUSE: "bg-muted/10 text-muted",
};

interface Props {
  membre: IMembre;
  emplacements: IEmplacement[];
  estCourant: boolean;
  onModifier: () => void;
  onRetirer: () => void;
}

export function CarteMembre({ membre, emplacements, estCourant, onModifier, onRetirer }: Props) {
  const initiales = `${membre.prenom.charAt(0)}${membre.nomFamille.charAt(0)}`;
  const empsActifs = membre.accessAllLocations
    ? "Tous les emplacements"
    : emplacements
        .filter((e) => membre.locationIds.includes(e.id))
        .map((e) => e.nom)
        .join(", ") || "Aucun emplacement";

  return (
    <Card>
      <Card.Content className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Avatar className="bg-accent/15 text-accent text-xs font-semibold w-10 h-10 shrink-0">
            {initiales}
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {membre.prenom} {membre.nomFamille}
                  </p>
                  {membre.isOwner && (
                    <Crown size={12} className="text-warning shrink-0" aria-label="Propriétaire" />
                  )}
                  {estCourant && (
                    <Chip className="text-[10px] bg-accent/10 text-accent">Vous</Chip>
                  )}
                </div>
                <p className="text-xs text-muted truncate flex items-center gap-1.5 mt-0.5">
                  <Mail size={10} className="shrink-0" />
                  {membre.email}
                </p>
                {membre.telephone && (
                  <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                    <Phone size={10} className="shrink-0" />
                    {membre.telephone}
                  </p>
                )}
              </div>
              <Chip className={`text-[10px] shrink-0 ${ROLE_VARIANTES[membre.role]}`}>
                {ROLES_LABELS[membre.role]}
              </Chip>
            </div>

            <div className="flex items-start gap-1.5 mt-3 text-xs text-muted">
              <MapPin size={12} className="shrink-0 mt-0.5" />
              <span className="line-clamp-2">{empsActifs}</span>
            </div>

            {!estCourant && !membre.isOwner && (
              <div className="flex items-center gap-1 mt-3">
                <Button
                  variant="ghost"
                  className="gap-1.5 text-xs text-muted hover:text-foreground"
                  onPress={onModifier}
                >
                  <Settings size={12} />
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  className="gap-1.5 text-xs text-muted hover:text-danger"
                  onPress={onRetirer}
                >
                  <UserMinus size={12} />
                  Retirer
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
