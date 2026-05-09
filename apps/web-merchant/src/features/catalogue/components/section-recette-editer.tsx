"use client";

import { useEffect, useState } from "react";
import { Button, Skeleton } from "@heroui/react";
import { Save } from "lucide-react";
import { useRecetteQuery } from "@/features/ingredient/queries/ingredient-list.query";
import { useDefinirRecetteMutation } from "@/features/ingredient/queries/recette-mutations";
import type { LigneRecetteDTO } from "@/features/ingredient/schemas/ingredient.schema";
import { SectionRecetteMenu } from "./section-recette-menu";

interface Props {
  varianteId: string;
}

export function SectionRecetteEditer({ varianteId }: Props) {
  const { data: recette, isLoading } = useRecetteQuery(varianteId);
  const [lignes, setLignes] = useState<LigneRecetteDTO[]>([]);
  const [initialise, setInitialise] = useState(false);
  const mutation = useDefinirRecetteMutation(varianteId);

  useEffect(() => {
    if (!initialise && recette) {
      setLignes(recette.map((l) => ({
        ingredientId: l.ingredientId,
        quantite: Number(l.quantite),
        unite: l.unite,
      })));
      setInitialise(true);
    }
  }, [recette, initialise]);

  const recetteCourante = (recette ?? []).map((l) => ({
    ingredientId: l.ingredientId,
    quantite: Number(l.quantite),
    unite: l.unite,
  }));
  const dirty = JSON.stringify(lignes) !== JSON.stringify(recetteCourante);

  if (isLoading) {
    return <Skeleton className="h-32 rounded-lg" />;
  }

  return (
    <div className="space-y-3">
      <SectionRecetteMenu lignes={lignes} onChange={setLignes} />
      <div className="flex justify-end pt-2 border-t border-border">
        <Button
          variant="primary"
          className="gap-1.5"
          onPress={() => mutation.mutate({ lignes })}
          isDisabled={!dirty || lignes.length === 0 || mutation.isPending}
        >
          <Save size={14} />
          {mutation.isPending ? "Enregistrement..." : "Enregistrer la recette"}
        </Button>
      </div>
    </div>
  );
}
