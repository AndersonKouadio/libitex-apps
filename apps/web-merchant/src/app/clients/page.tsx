"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Button, TextField, Label, Input, FieldError, Table, Skeleton } from "@heroui/react";
import { Users, UserPlus, Search, Phone, Mail, MapPin, Trash2 } from "lucide-react";
import { useClientListQuery, useSupprimerClientMutation } from "@/features/client/queries/client.query";
import { ModalCreerClient } from "@/features/client/components/modal-creer-client";

export default function PageClients() {
  const [recherche, setRecherche] = useState("");
  const [modalOuvert, setModalOuvert] = useState(false);
  const { data, isLoading } = useClientListQuery(1, recherche || undefined);
  const supprimer = useSupprimerClientMutation();
  const clients = data?.data ?? [];

  async function handleSupprimer(id: string, nom: string) {
    if (!window.confirm(`Supprimer le client ${nom} ?`)) return;
    await supprimer.mutateAsync(id);
  }

  return (
    <>
      <Topbar titre="Clients" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-base font-semibold text-foreground">
              {data?.meta.total ?? 0} client{(data?.meta.total ?? 0) > 1 ? "s" : ""}
            </h1>
            <p className="text-xs text-muted mt-0.5">
              Coordonnées et historique des clients réguliers de votre boutique.
            </p>
          </div>
          <Button variant="primary" className="gap-2" onPress={() => setModalOuvert(true)}>
            <UserPlus size={16} />
            Nouveau client
          </Button>
        </header>

        <div className="mb-4 max-w-md">
          <TextField value={recherche} onChange={setRecherche}>
            <Label className="sr-only">Rechercher</Label>
            <Input placeholder="Rechercher par nom, téléphone ou email" />
            <FieldError />
          </TextField>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/10 inline-flex items-center justify-center mb-3">
              <Users size={20} className="text-muted/50" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {recherche ? "Aucun client ne correspond" : "Aucun client pour le moment"}
            </p>
            {!recherche && (
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                Ajoutez vos premiers clients pour les retrouver rapidement et personnaliser leur expérience.
              </p>
            )}
          </div>
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Liste des clients">
                <Table.Header className="table-header-libitex">
                  <Table.Column isRowHeader>Nom</Table.Column>
                  <Table.Column>Contact</Table.Column>
                  <Table.Column>Adresse</Table.Column>
                  <Table.Column>Notes</Table.Column>
                  <Table.Column className="w-12"> </Table.Column>
                </Table.Header>
                <Table.Body>
                  {clients.map((c) => (
                    <Table.Row key={c.id}>
                      <Table.Cell>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {c.prenom} {c.nomFamille ?? ""}
                          </p>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="space-y-0.5">
                          {c.telephone && (
                            <p className="text-xs text-muted flex items-center gap-1.5">
                              <Phone size={11} className="shrink-0" />
                              {c.telephone}
                            </p>
                          )}
                          {c.email && (
                            <p className="text-xs text-muted flex items-center gap-1.5">
                              <Mail size={11} className="shrink-0" />
                              {c.email}
                            </p>
                          )}
                          {!c.telephone && !c.email && (
                            <span className="text-xs text-muted/60">—</span>
                          )}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        {c.adresse ? (
                          <p className="text-xs text-muted flex items-center gap-1.5">
                            <MapPin size={11} className="shrink-0" />
                            {c.adresse}
                          </p>
                        ) : (
                          <span className="text-xs text-muted/60">—</span>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-xs text-muted line-clamp-2">{c.notes ?? "—"}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          variant="ghost"
                          className="text-muted hover:text-danger p-1.5 h-auto min-w-0"
                          aria-label={`Supprimer ${c.prenom}`}
                          onPress={() => handleSupprimer(c.id, `${c.prenom} ${c.nomFamille ?? ""}`.trim())}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </div>

      <ModalCreerClient ouvert={modalOuvert} onFermer={() => setModalOuvert(false)} />
    </>
  );
}
