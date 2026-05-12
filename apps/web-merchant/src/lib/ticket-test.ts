import type { ITicket } from "@/features/vente/types/vente.type";

/**
 * Ticket fictif utilise pour les tests d'impression depuis
 * /parametres/imprimante. Sortir le mock dans un fichier dedie permet :
 * - de garder la page parametres lisible (< 150 lignes)
 * - de tester l'encoder ESC/POS depuis Jest sans monter de fixture
 * - d'evoluer le contenu (ajout supplements, remise...) sans toucher l'UI
 *
 * Ne PAS reutiliser ce mock pour autre chose qu'un test : l'id "test" et
 * le numero "TEST" sont volontairement faux pour ne jamais collisionner
 * avec un vrai ticket en base.
 */
export function construireTicketTest(): ITicket {
  return {
    id: "test",
    numeroTicket: "TEST",
    statut: "COMPLETED",
    sousTotal: 1500,
    montantTva: 0,
    montantRemise: 0,
    total: 1500,
    nomClient: "Test client",
    lignes: [
      {
        id: "tl1",
        varianteId: "v1",
        nomProduit: "Article de test",
        nomVariante: "Standard",
        sku: "TEST-001",
        quantite: 1,
        prixUnitaire: 1500,
        remise: 0,
        tauxTva: 0,
        montantTva: 0,
        totalLigne: 1500,
        supplements: [],
      },
    ],
    paiements: [{ id: "p1", methode: "CASH", montant: 2000 }],
    creeLe: new Date().toISOString(),
  };
}
