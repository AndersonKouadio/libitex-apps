"use client";

import { useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button, Skeleton } from "@heroui/react";
import { Plus, Pencil, Trash2, FolderTree, Folder, ChevronRight } from "lucide-react";
import { useCategorieListQuery } from "@/features/catalogue/queries/categorie-list.query";
import { useSupprimerCategorieMutation } from "@/features/catalogue/queries/categorie.mutations";
import { ModalCategorie } from "@/features/catalogue/components/modal-categorie";
import type { ICategorie } from "@/features/catalogue/types/produit.type";

interface NoeudArbre {
  categorie: ICategorie;
  enfants: NoeudArbre[];
}

function construireArbre(categories: ICategorie[]): NoeudArbre[] {
  const parId = new Map<string, NoeudArbre>();
  for (const c of categories) parId.set(c.id, { categorie: c, enfants: [] });

  const racines: NoeudArbre[] = [];
  for (const c of categories) {
    const noeud = parId.get(c.id)!;
    if (c.parentId && parId.has(c.parentId)) {
      parId.get(c.parentId)!.enfants.push(noeud);
    } else {
      racines.push(noeud);
    }
  }
  return racines;
}

export default function PageCategories() {
  const { data, isLoading } = useCategorieListQuery();
  const supprimer = useSupprimerCategorieMutation();
  const [modalOuvert, setModalOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<ICategorie | null>(null);

  const categories = data ?? [];
  const arbre = useMemo(() => construireArbre(categories), [categories]);

  function ouvrirCreation() {
    setEnEdition(null);
    setModalOuvert(true);
  }

  function ouvrirEdition(c: ICategorie) {
    setEnEdition(c);
    setModalOuvert(true);
  }

  async function handleSupprimer(c: ICategorie) {
    if (!window.confirm(`Supprimer la catégorie « ${c.nom} » ?`)) return;
    await supprimer.mutateAsync(c.id);
  }

  return (
    <PageContainer taille="moyen">
      <PageHeader
        titre={`${categories.length} catégorie${categories.length > 1 ? "s" : ""}`}
        description="Structurez votre catalogue en familles et sous-familles. Une catégorie ne peut être supprimée que si aucun produit n'y est rattaché."
        actions={
          <Button variant="primary" className="gap-1.5" onPress={ouvrirCreation}>
            <Plus size={16} />
            Nouvelle catégorie
          </Button>
        }
      />

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 inline-flex items-center justify-center mb-3">
              <FolderTree size={20} className="text-accent" />
            </div>
            <p className="text-sm font-medium text-foreground">Aucune catégorie</p>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              Créez votre première catégorie pour organiser vos produits (ex. Boissons, Plats, Accessoires).
            </p>
            <Button variant="primary" className="gap-1.5 mt-4" onPress={ouvrirCreation}>
              <Plus size={16} />
              Créer une catégorie
            </Button>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <ul>
              {arbre.map((noeud, i) => (
                <NoeudCategorie
                  key={noeud.categorie.id}
                  noeud={noeud}
                  niveau={0}
                  premierDeNiveau={i === 0}
                  onModifier={ouvrirEdition}
                  onSupprimer={handleSupprimer}
                />
              ))}
            </ul>
          </div>
        )}

      <ModalCategorie
        ouvert={modalOuvert}
        onFermer={() => setModalOuvert(false)}
        categorie={enEdition}
      />
    </PageContainer>
  );
}

function NoeudCategorie({
  noeud, niveau, premierDeNiveau, onModifier, onSupprimer,
}: {
  noeud: NoeudArbre;
  niveau: number;
  premierDeNiveau: boolean;
  onModifier: (c: ICategorie) => void;
  onSupprimer: (c: ICategorie) => void;
}) {
  const aDesEnfants = noeud.enfants.length > 0;
  return (
    <>
      <li
        className={`flex items-center gap-2 px-3 py-2.5 hover:bg-surface-secondary/50 transition-colors ${
          niveau === 0 && !premierDeNiveau ? "border-t border-border" : ""
        } ${niveau > 0 ? "border-t border-border/50" : ""}`}
        style={{ paddingLeft: `${12 + niveau * 24}px` }}
      >
        {niveau > 0 && <ChevronRight size={12} className="text-muted/50 shrink-0" />}
        <Folder size={14} className={niveau === 0 ? "text-accent shrink-0" : "text-muted shrink-0"} />
        <span className="flex-1 text-sm text-foreground truncate">
          {noeud.categorie.nom}
          {aDesEnfants && (
            <span className="text-[10px] text-muted ml-2">
              {noeud.enfants.length} sous-catégorie{noeud.enfants.length > 1 ? "s" : ""}
            </span>
          )}
        </span>
        <span className="text-[10px] text-muted/60 font-mono mr-2">{noeud.categorie.slug}</span>
        <Button
          variant="ghost"
          className="text-muted hover:text-accent p-1.5 h-auto min-w-0"
          aria-label={`Modifier ${noeud.categorie.nom}`}
          onPress={() => onModifier(noeud.categorie)}
        >
          <Pencil size={14} />
        </Button>
        <Button
          variant="ghost"
          className="text-muted hover:text-danger p-1.5 h-auto min-w-0"
          aria-label={`Supprimer ${noeud.categorie.nom}`}
          onPress={() => onSupprimer(noeud.categorie)}
        >
          <Trash2 size={14} />
        </Button>
      </li>
      {noeud.enfants.map((enfant) => (
        <NoeudCategorie
          key={enfant.categorie.id}
          noeud={enfant}
          niveau={niveau + 1}
          premierDeNiveau={false}
          onModifier={onModifier}
          onSupprimer={onSupprimer}
        />
      ))}
    </>
  );
}
