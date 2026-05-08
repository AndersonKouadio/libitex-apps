"use client";

import { useEffect, useState } from "react";
import { Modal, Button } from "@heroui/react";
import { Settings } from "lucide-react";
import { useModifierMembreMutation } from "../queries/equipe.query";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { SelecteurRole, type RoleInvitable } from "./selecteur-role";
import { SelecteurAcces } from "./selecteur-acces";
import type { IMembre } from "../types/equipe.type";

interface Props {
  membre: IMembre | null;
  onFermer: () => void;
}

export function ModalModifierMembre({ membre, onFermer }: Props) {
  const mutation = useModifierMembreMutation();
  const { data: emplacements } = useEmplacementListQuery();

  const [role, setRole] = useState<RoleInvitable>("CASHIER");
  const [accessAllLocations, setAccessAllLocations] = useState(true);
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (membre) {
      // Si le membre est SUPER_ADMIN on ne peut pas le modifier via cette UI,
      // on retombe sur ADMIN par defaut sans persister tant que rien n'est change.
      setRole(membre.role === "SUPER_ADMIN" ? "ADMIN" : (membre.role as RoleInvitable));
      setAccessAllLocations(membre.accessAllLocations);
      setLocationIds(membre.locationIds);
      setErreur("");
    }
  }, [membre]);

  async function soumettre() {
    if (!membre) return;
    setErreur("");
    try {
      await mutation.mutateAsync({
        id: membre.membershipId,
        data: { role, accessAllLocations, locationIds: accessAllLocations ? [] : locationIds },
      });
      onFermer();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Modal.Backdrop isOpen={!!membre} onOpenChange={(open) => { if (!open) onFermer(); }}>
      <Modal.Container size="md" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <Settings className="size-5" />
            </Modal.Icon>
            <Modal.Heading>
              {membre ? `${membre.prenom} ${membre.nomFamille}` : "Modifier"}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            {erreur && (
              <div className="px-3 py-2.5 rounded-lg bg-danger/10 text-danger text-sm">{erreur}</div>
            )}
            {membre && (
              <p className="text-xs text-muted">
                {membre.email}
                {membre.isOwner && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">
                    Propriétaire
                  </span>
                )}
              </p>
            )}

            <SelecteurRole
              valeur={role}
              onChange={(r) => {
                setRole(r);
                if (r === "ADMIN") setAccessAllLocations(true);
              }}
              disabled={membre?.isOwner}
            />

            <SelecteurAcces
              accessAllLocations={accessAllLocations}
              locationIds={locationIds}
              emplacements={emplacements ?? []}
              onChange={({ accessAllLocations: a, locationIds: l }) => {
                setAccessAllLocations(a);
                setLocationIds(l);
              }}
              disabled={role === "ADMIN" || membre?.isOwner}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" slot="close">Annuler</Button>
            <Button variant="primary" onPress={soumettre} isDisabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
