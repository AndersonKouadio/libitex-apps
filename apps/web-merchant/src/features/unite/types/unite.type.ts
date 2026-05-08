// Re-exports depuis @libitex/shared pour que tout le front consomme le slice
// unite via une porte unique. Aucune duplication possible.
export {
  UniteMesure,
  UniteCategorie,
  UNITE_LABELS,
  UNITE_LABELS_LONGS,
  UNITE_CATEGORIE,
  UNITE_BASE,
  UNITES_PAR_CATEGORIE,
  uniteAccepteDecimal,
  convertirVersUnite,
  formaterQuantite,
} from "@libitex/shared";
