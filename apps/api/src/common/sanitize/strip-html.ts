import { Transform } from "class-transformer";

/**
 * Strip all HTML tags + decode HTML entities from a string.
 * Defense en profondeur contre XSS dans les champs texte libre exposes
 * cote public (showcase) : nom de boutique, description produit, adresse...
 *
 * On utilise une regex simple plutot que DOMPurify pour eviter une dep
 * lourde cote backend. On accepte le texte plat uniquement — pas de
 * markdown, pas de HTML.
 *
 * Note : ne couvre pas les attaques sophistiquees (DOM clobbering, etc.)
 * mais elles ne sont pas exploitables ici car le frontend ne fait pas
 * de dangerouslySetInnerHTML sur ces champs (text node React = safe).
 * C'est de la defense en profondeur.
 */
export function stripHtml(input: string | undefined | null): string | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== "string") return undefined;
  // 1. Strip tags HTML
  let s = input.replace(/<[^>]*>/g, "");
  // 2. Decode les entites HTML courantes pour eviter le double-encodage
  s = s
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#96;/g, "`");
  // 3. Strip les caracteres de controle invisibles (sauf newline/tab)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return s.trim();
}

/**
 * Decorateur class-transformer : strip HTML d'un champ string optionnel.
 * Applique automatiquement a la deserialisation des DTOs.
 *
 * Usage :
 *   @SanitizeHtmlString()
 *   @IsOptional()
 *   description?: string;
 */
export function SanitizeHtmlString() {
  return Transform(({ value }) => stripHtml(value));
}
