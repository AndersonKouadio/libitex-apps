"use client";

import { useRouter, usePathname } from "next/navigation";
import { Avatar, Button, Dropdown } from "@heroui/react";
import { Bell, Store, Settings, LogOut, Check } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSwitcherBoutiqueMutation } from "@/features/boutique/queries/boutique-switch.mutation";
import { SECTEUR_LABELS } from "@/features/auth/utils/secteur-activite";
import type { SecteurActivite } from "@/features/auth/types/auth.type";
import { Breadcrumbs } from "./breadcrumbs";
import { obtenirTitre } from "./route-meta";
import { ToggleTheme } from "./toggle-theme";

interface Props {
  /** Surcharge le titre auto-resolu depuis la route. */
  titre?: string;
}

export function Topbar({ titre: titreManuel }: Props = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { utilisateur, boutiques, boutiqueActive, deconnecter } = useAuth();
  const switcher = useSwitcherBoutiqueMutation();
  const initiales = `${utilisateur?.prenom?.charAt(0) ?? ""}${utilisateur?.nomFamille?.charAt(0) ?? ""}`;
  const titre = titreManuel ?? obtenirTitre(pathname);

  return (
    <header className="sticky top-0 z-10 bg-surface border-b border-border safe-top">
      <div className="flex items-center justify-between px-4 lg:px-6 gap-3 py-2.5">
        <div className="flex flex-col min-w-0 flex-1 gap-0.5 pl-12 lg:pl-0">
          {titre && (
            <h1 className="text-base lg:text-lg font-semibold text-foreground truncate leading-none">
              {titre}
            </h1>
          )}
          <Breadcrumbs />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <ToggleTheme />

          <Button
            variant="ghost"
            className="w-9 h-9 min-w-0 p-0 text-muted hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </Button>

          <Dropdown>
            <Dropdown.Trigger>
              <button
                type="button"
                aria-label="Mon compte"
                className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Avatar className="bg-accent text-accent-foreground text-xs font-semibold w-9 h-9">
                  {initiales || "•"}
                </Avatar>
              </button>
            </Dropdown.Trigger>
            <Dropdown.Popover className="min-w-[260px]">
              <Dropdown.Menu>
                <Dropdown.Item id="user-info" textValue="Profil" isDisabled>
                  <div className="flex flex-col gap-0.5 py-1">
                    <span className="text-sm font-semibold text-foreground">
                      {utilisateur?.prenom} {utilisateur?.nomFamille}
                    </span>
                    <span className="text-xs text-muted truncate max-w-[220px]">
                      {utilisateur?.email}
                    </span>
                  </div>
                </Dropdown.Item>

                {boutiques.map((b) => (
                  <Dropdown.Item
                    key={b.id}
                    id={b.id}
                    textValue={b.nom}
                    onAction={() => {
                      if (boutiqueActive?.id !== b.id) switcher.mutate(b.id);
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Store size={14} className="text-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.nom}</p>
                        <p className="text-[10px] text-muted truncate">
                          {SECTEUR_LABELS[b.secteurActivite as SecteurActivite]}
                        </p>
                      </div>
                      {boutiqueActive?.id === b.id && (
                        <Check size={14} className="text-accent shrink-0" />
                      )}
                    </div>
                  </Dropdown.Item>
                ))}

                <Dropdown.Item
                  id="parametres"
                  textValue="Paramètres"
                  onAction={() => router.push("/parametres")}
                >
                  <div className="flex items-center gap-2">
                    <Settings size={14} className="text-muted" />
                    <span className="text-sm">Paramètres</span>
                  </div>
                </Dropdown.Item>

                <Dropdown.Item
                  id="logout"
                  textValue="Déconnexion"
                  onAction={() => deconnecter()}
                >
                  <div className="flex items-center gap-2 text-danger">
                    <LogOut size={14} />
                    <span className="text-sm">Déconnexion</span>
                  </div>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
