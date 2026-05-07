"use client";

import { Dropdown, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { Store, Check, Plus, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSwitcherBoutiqueMutation } from "../queries/boutique-switch.mutation";
import { SECTEUR_LABELS } from "@/features/auth/utils/secteur-activite";
import type { SecteurActivite } from "@/features/auth/types/auth.type";

interface Props {
  replie: boolean;
}

export function SwitcherBoutique({ replie }: Props) {
  const router = useRouter();
  const { boutiques, boutiqueActive } = useAuth();
  const switcher = useSwitcherBoutiqueMutation();

  if (!boutiqueActive) return null;

  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-3 py-2 h-auto bg-white/5 hover:bg-white/10 text-white border border-white/10"
        >
          <span className="w-7 h-7 rounded-md bg-accent/20 text-accent flex items-center justify-center shrink-0">
            <Store size={14} />
          </span>
          {!replie && (
            <>
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-[12px] font-semibold text-white truncate">
                  {boutiqueActive.nom}
                </span>
                <span className="block text-[10px] text-white/40 truncate">
                  {SECTEUR_LABELS[boutiqueActive.secteurActivite as SecteurActivite]}
                </span>
              </span>
              <ChevronsUpDown size={14} className="text-white/40 shrink-0" />
            </>
          )}
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover className="min-w-[260px]">
        <Dropdown.Menu>
          {boutiques.map((b) => (
            <Dropdown.Item
              key={b.id}
              id={b.id}
              textValue={b.nom}
              onAction={() => { if (b.id !== boutiqueActive.id) switcher.mutate(b.id); }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Store size={14} className="text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.nom}</p>
                  <p className="text-xs text-muted truncate">
                    {SECTEUR_LABELS[b.secteurActivite as SecteurActivite]}
                  </p>
                </div>
                {b.id === boutiqueActive.id && <Check size={14} className="text-accent shrink-0" />}
              </div>
            </Dropdown.Item>
          ))}
          <Dropdown.Item
            id="ajouter"
            textValue="Nouvelle boutique"
            onAction={() => router.push("/parametres/boutiques")}
          >
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-accent" />
              <span className="text-sm text-accent font-medium">Nouvelle boutique</span>
            </div>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
