const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

interface ResultatUpload {
  url: string;
  cle: string;
}

type CibleUpload = "produits" | "boutiques" | "categories";

export async function uploaderImage(
  token: string,
  cible: CibleUpload,
  fichier: File,
): Promise<ResultatUpload> {
  const formData = new FormData();
  formData.append("file", fichier);

  const reponse = await fetch(`${BASE_URL}/uploads/image/${cible}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!reponse.ok) {
    const erreur = await reponse.json().catch(() => ({}));
    throw new Error(erreur?.error || erreur?.message || `Echec upload (${reponse.status})`);
  }

  const json = await reponse.json();
  return json.data ?? json;
}
