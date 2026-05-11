import type { IRapportZ, IRapportVentesPeriode, IRapportMarges } from "../types/vente.type";
import { libelleMethode } from "./methode-paiement";

/**
 * Telecharge un fichier texte/CSV dans le navigateur sans backend.
 * Note: ajoute le BOM UTF-8 pour qu'Excel reconnaisse les accents.
 */
function telechargerFichier(nom: string, contenu: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + contenu], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(v: string | number): string {
  const s = String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Exporte un rapport Z en CSV (separateur virgule). 5 sections separees
 * par une ligne vide : entete, resume, ventilation paiements, top produits,
 * ventes par heure.
 */
export function exporterRapportZCsv(rapport: IRapportZ, nomEmplacement: string) {
  const lignes: string[] = [];
  lignes.push(`Rapport Z,${csvEscape(nomEmplacement)},${csvEscape(rapport.date)}`);
  lignes.push("");
  lignes.push("Indicateur,Valeur");
  lignes.push(`Recettes (F),${rapport.resume.chiffreAffaires}`);
  lignes.push(`Tickets,${rapport.resume.totalTickets}`);
  lignes.push(`TVA collectee (F),${rapport.resume.totalTva}`);
  lignes.push(`Remises (F),${rapport.resume.totalRemise}`);
  lignes.push("");
  lignes.push("Methode,Total (F),Nb transactions");
  for (const p of rapport.ventilationPaiements) {
    lignes.push(`${csvEscape(libelleMethode(p.methode))},${p.total},${p.nombre}`);
  }
  if (rapport.topProduits.length > 0) {
    lignes.push("");
    lignes.push("Top produit,SKU,Quantite,CA (F)");
    for (const t of rapport.topProduits) {
      lignes.push(`${csvEscape(t.nomProduit)},${csvEscape(t.sku)},${t.quantite},${t.chiffreAffaires}`);
    }
  }
  if (rapport.ventesParHeure.length > 0) {
    lignes.push("");
    lignes.push("Heure,Recettes (F),Tickets");
    for (const v of rapport.ventesParHeure) {
      lignes.push(`${String(v.heure).padStart(2, "0")}h,${v.recettes},${v.nombre}`);
    }
  }
  const nom = `rapport-z-${rapport.date}.csv`;
  telechargerFichier(nom, lignes.join("\n"));
}

export function exporterVentesPeriodeCsv(rapport: IRapportVentesPeriode, nomEmplacement?: string) {
  const lignes: string[] = [];
  lignes.push(`Ventes par periode,${csvEscape(nomEmplacement || "Tous emplacements")},${csvEscape(rapport.debut)} -> ${csvEscape(rapport.fin)}`);
  lignes.push("");
  lignes.push("Date,Tickets,Recettes (F),Ticket moyen (F),TVA (F),Remises (F)");
  for (const j of rapport.jours) {
    lignes.push(`${j.date},${j.nombre},${j.recettes},${j.ticketMoyen},${j.tva},${j.remises}`);
  }
  lignes.push("");
  lignes.push(`Total,${rapport.totaux.tickets},${rapport.totaux.recettes},${rapport.totaux.ticketMoyen},${rapport.totaux.tva},${rapport.totaux.remises}`);
  telechargerFichier(`ventes-${rapport.debut}_${rapport.fin}.csv`, lignes.join("\n"));
}

export function exporterMargesCsv(rapport: IRapportMarges, nomEmplacement?: string) {
  const lignes: string[] = [];
  lignes.push(`Marges par produit,${csvEscape(nomEmplacement || "Tous emplacements")},${csvEscape(rapport.debut)} -> ${csvEscape(rapport.fin)}`);
  lignes.push("");
  lignes.push("Produit,SKU,Quantite,CA (F),Cout (F),Marge brute (F),Marge %,Prix achat manquant");
  for (const l of rapport.lignes) {
    lignes.push([
      csvEscape(l.nomProduit), csvEscape(l.sku),
      l.quantiteTotale, l.chiffreAffaires, l.coutTotal, l.margeBrute, l.margePourcent,
      l.prixAchatManquant ? "oui" : "non",
    ].join(","));
  }
  lignes.push("");
  lignes.push(`Total,,${rapport.totaux.quantiteTotale},${rapport.totaux.chiffreAffaires},${rapport.totaux.coutTotal},${rapport.totaux.margeBrute},${rapport.totaux.margePourcent},`);
  telechargerFichier(`marges-${rapport.debut}_${rapport.fin}.csv`, lignes.join("\n"));
}
