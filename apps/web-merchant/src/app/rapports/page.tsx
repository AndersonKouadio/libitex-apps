"use client";

import { useState } from "react";
import { Select, ListBox, Label, TextField, Input, Button, Spinner } from "@heroui/react";
import { Topbar } from "@/components/layout/topbar";
import { useEmplacementListQuery } from "@/features/stock/queries/emplacement-list.query";
import { useTicketListQuery } from "@/features/vente/queries/ticket-list.query";
import { useRapportZQuery } from "@/features/vente/queries/rapport-z.query";
import { RapportZResume } from "@/features/vente/components/rapport-z-resume";
import { RapportZVentilation } from "@/features/vente/components/rapport-z-ventilation";
import { HistoriqueTickets } from "@/features/vente/components/historique-tickets";

function aujourdhui(): string {
  return new Date().toISOString().split("T")[0]!;
}

export default function PageRapports() {
  const { data: emplacements } = useEmplacementListQuery();
  const [empId, setEmpId] = useState("");
  const [date, setDate] = useState(aujourdhui());
  const [empConsulte, setEmpConsulte] = useState<string | undefined>();
  const [dateConsultee, setDateConsultee] = useState<string>(date);

  const { data: ticketsData } = useTicketListQuery({ page: 1 });
  const { data: rapport, isFetching } = useRapportZQuery(empConsulte, dateConsultee);

  const empParDefaut = empId || emplacements?.[0]?.id || "";

  function generer() {
    if (!empParDefaut) return;
    setEmpConsulte(empParDefaut);
    setDateConsultee(date);
  }

  return (
    <>
      <Topbar titre="Rapports" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <Select
            selectedKey={empParDefaut}
            onSelectionChange={(key) => setEmpId(String(key))}
            aria-label="Emplacement"
            className="min-w-[200px]"
          >
            <Label>Emplacement</Label>
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

          <TextField type="date" value={date} onChange={setDate}>
            <Label>Date</Label>
            <Input />
          </TextField>

          <Button variant="primary" onPress={generer} isDisabled={isFetching || !empParDefaut}>
            {isFetching ? <Spinner size="sm" /> : "Generer le Z"}
          </Button>
        </div>

        {rapport && (
          <div className="space-y-4">
            <RapportZResume rapport={rapport} />
            <RapportZVentilation rapport={rapport} />
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
            Derniers tickets
          </h2>
          <HistoriqueTickets tickets={ticketsData?.data ?? []} />
        </section>
      </div>
    </>
  );
}
