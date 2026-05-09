import { httpClient } from "@/lib/http";
import type {
  ISupplement, CategorieSupplement,
} from "../types/supplement.type";
import type {
  CreerSupplementDTO, ModifierSupplementDTO,
} from "../schemas/supplement.schema";
import type { PaginatedResponse } from "@/types/api.type";

/**
 * Adapter qui taps sur /catalogue/produits avec isSupplement=true.
 * Les supplements sont des produits SIMPLE avec un drapeau dedie ; cette
 * facade preserve la forme externe ISupplement pour ne pas casser les pages
 * et la modale qui consomment ces hooks.
 */

const BASE = "/catalogue";

interface IVarianteRaw {
  id: string;
  sku: string;
  prixDetail: number;
}

interface IProduitRaw {
  id: string;
  nom: string;
  description: string | null;
  images: string[];
  metadataSecteur: Record<string, unknown> | null;
  actif: boolean;
  isSupplement: boolean;
  variantes: IVarianteRaw[];
  creeLe: string;
}

function produitVersSupplement(p: IProduitRaw): ISupplement {
  const meta = (p.metadataSecteur ?? {}) as { categorieSupplement?: CategorieSupplement };
  return {
    id: p.id,
    nom: p.nom,
    description: p.description,
    prix: p.variantes[0]?.prixDetail ?? 0,
    categorie: meta.categorieSupplement ?? "AUTRE",
    image: p.images?.[0] ?? null,
    actif: p.actif,
    creeLe: p.creeLe,
  };
}

function genererSku(nom: string): string {
  const slug = nom.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 12);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SUPP-${slug || "X"}-${random}`;
}

export const supplementAPI = {
  lister: async (token: string): Promise<ISupplement[]> => {
    const res = await httpClient.get<PaginatedResponse<IProduitRaw>>(
      `${BASE}/produits?page=1&limit=100&isSupplement=true`,
      { token },
    );
    return res.data.map(produitVersSupplement);
  },

  obtenir: async (token: string, id: string): Promise<ISupplement> => {
    const p = await httpClient.get<IProduitRaw>(`${BASE}/produits/${id}`, { token });
    return produitVersSupplement(p);
  },

  creer: async (token: string, data: CreerSupplementDTO): Promise<ISupplement> => {
    const p = await httpClient.post<IProduitRaw>(
      `${BASE}/produits`,
      {
        nom: data.nom,
        description: data.description,
        typeProduit: "SIMPLE",
        isSupplement: true,
        images: data.image ? [data.image] : [],
        metadataSecteur: { categorieSupplement: data.categorie },
        variantes: [{
          sku: genererSku(data.nom),
          prixDetail: data.prix,
          uniteVente: "PIECE",
        }],
      },
      { token },
    );
    return produitVersSupplement(p);
  },

  modifier: async (
    token: string, id: string, data: ModifierSupplementDTO,
  ): Promise<ISupplement> => {
    // Etape 1 : metadonnees du produit (nom, description, image, categorie, actif).
    const produitDto: Record<string, unknown> = {
      isSupplement: true,
    };
    if (data.nom !== undefined) produitDto.nom = data.nom;
    if (data.description !== undefined) produitDto.description = data.description;
    if (data.image !== undefined) produitDto.images = data.image ? [data.image] : [];
    if (data.categorie !== undefined) {
      produitDto.metadataSecteur = { categorieSupplement: data.categorie };
    }
    if (data.actif !== undefined) produitDto.actif = data.actif;

    const p = await httpClient.patch<IProduitRaw>(
      `${BASE}/produits/${id}`, produitDto, { token },
    );

    // Etape 2 : prix de la variante (un seul variant pour les supplements).
    if (data.prix !== undefined && p.variantes[0]) {
      await httpClient.patch(
        `${BASE}/produits/${id}/variantes/${p.variantes[0].id}`,
        { prixDetail: data.prix },
        { token },
      );
      // Re-fetch pour avoir le prix a jour dans la reponse.
      const refreshed = await httpClient.get<IProduitRaw>(`${BASE}/produits/${id}`, { token });
      return produitVersSupplement(refreshed);
    }

    return produitVersSupplement(p);
  },

  supprimer: (token: string, id: string) =>
    httpClient.delete<void>(`${BASE}/produits/${id}`, { token }),
};
