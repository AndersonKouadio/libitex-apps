"use client";

import { useState, useEffect } from "react";
import { Button, Card, TextField, Label, Input, Skeleton, toast } from "@heroui/react";
import { Save } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ChampSecteur } from "@/features/auth/components/champ-secteur";
import { ChampDevise } from "@/features/auth/components/champ-devise";
import type { SecteurActivite } from "@/features/auth/types/auth.type";
import { useBoutiqueActiveQuery } from "@/features/boutique/queries/boutique-active.query";
import { useModifierBoutiqueMutation } from "@/features/boutique/queries/boutique.mutations";

export default function PageProfilBoutique() {
  const { data: boutique, isLoading } = useBoutiqueActiveQuery();
  const mutation = useModifierBoutiqueMutation();

  const [nom, setNom] = useState("");
  const [secteur, setSecteur] = useState<SecteurActivite>("AUTRE");
  const [devise, setDevise] = useState("XOF");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [tauxTva, setTauxTva] = useState("0");

  useEffect(() => {
    if (!boutique) return;
    setNom(boutique.nom);
    setSecteur(boutique.secteurActivite as SecteurActivite);
    setDevise(boutique.devise);
    setEmail(boutique.email ?? "");
    setTelephone(boutique.telephone ?? "");
    setAdresse(boutique.adresse ?? "");
    setTauxTva(String(boutique.tauxTva ?? 0));
  }, [boutique]);

  async function enregistrer() {
    if (!boutique) return;
    if (!nom.trim()) {
      toast.danger("Le nom est requis");
      return;
    }
    const tva = Number(tauxTva);
    if (Number.isNaN(tva) || tva < 0 || tva > 100) {
      toast.danger("Le taux de TVA doit être entre 0 et 100");
      return;
    }
    await mutation.mutateAsync({
      tenantId: boutique.id,
      data: {
        nom,
        secteurActivite: secteur,
        devise,
        email: email || undefined,
        telephone: telephone || undefined,
        adresse: adresse || undefined,
        tauxTva: tva,
      },
    });
  }

  return (
    <PageContainer>
      <PageHeader
        titre="Profil de la boutique"
        description="Nom, secteur d'activité, devise, contact et adresse de la boutique active. Pour modifier une autre boutique, basculez dessus depuis « Mes boutiques »."
      />

      <Card>
        <Card.Content className="p-6 space-y-5">
          {isLoading || !boutique ? (
            <div className="space-y-3">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          ) : (
            <>
              <TextField isRequired value={nom} onChange={setNom}>
                <Label>Nom de la boutique</Label>
                <Input />
              </TextField>

              <div className="flex items-center gap-2 px-1">
                <span className="text-xs text-muted">Identifiant URL :</span>
                <span className="text-xs font-mono text-foreground">{boutique.slug}</span>
                <span className="text-[10px] text-muted/70">(non modifiable)</span>
              </div>

              <ChampSecteur isRequired valeur={secteur} onChange={setSecteur} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ChampDevise valeur={devise} onChange={setDevise} />
                <TextField type="email" value={email} onChange={setEmail}>
                  <Label>Email de contact</Label>
                  <Input placeholder="contact@boutique.sn" />
                </TextField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField value={telephone} onChange={setTelephone}>
                  <Label>Téléphone</Label>
                  <Input placeholder="+221 77 000 12 34" type="tel" />
                </TextField>
                <TextField value={adresse} onChange={setAdresse}>
                  <Label>Adresse</Label>
                  <Input placeholder="Plateau, Dakar" />
                </TextField>
              </div>

              <TextField type="number" value={tauxTva} onChange={setTauxTva}>
                <Label>Taux de TVA par défaut (%)</Label>
                <Input placeholder="18" min="0" max="100" step="0.1" />
                <p className="text-xs text-muted mt-1">
                  Appliqué aux nouveaux produits. En Côte d'Ivoire, le taux standard est 18%. Mettre 0 pour exonéré.
                </p>
              </TextField>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  className="gap-1.5"
                  onPress={enregistrer}
                  isDisabled={mutation.isPending}
                >
                  <Save size={16} />
                  {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </>
          )}
        </Card.Content>
      </Card>
    </PageContainer>
  );
}
