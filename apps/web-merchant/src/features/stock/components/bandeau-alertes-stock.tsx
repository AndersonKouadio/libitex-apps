"use client";

import { Alert, Button } from "@heroui/react";

interface Props {
  nbAlertes: number;
  nbRuptures: number;
  filtreActif: boolean;
  onBasculerFiltre: () => void;
}

export function BandeauAlertesStock({ nbAlertes, nbRuptures, filtreActif, onBasculerFiltre }: Props) {
  const total = nbAlertes + nbRuptures;
  if (total === 0) return null;
  const status = nbRuptures > 0 ? "danger" : "warning";
  const titre =
    nbRuptures > 0
      ? `${nbRuptures} produit${nbRuptures > 1 ? "s" : ""} en rupture${nbAlertes > 0 ? ` et ${nbAlertes} en stock faible` : ""}`
      : `${nbAlertes} produit${nbAlertes > 1 ? "s" : ""} en stock faible`;
  return (
    <Alert status={status} className="mb-4">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{titre}</Alert.Title>
        <Alert.Description>
          Réceptionnez de la marchandise ou ajustez l'inventaire pour éviter les ruptures au POS.
        </Alert.Description>
      </Alert.Content>
      <Button
        variant={filtreActif ? "primary" : status === "danger" ? "danger" : "secondary"}
        className="text-xs whitespace-nowrap"
        onPress={onBasculerFiltre}
      >
        {filtreActif ? "Voir tout" : "Filtrer"}
      </Button>
    </Alert>
  );
}
