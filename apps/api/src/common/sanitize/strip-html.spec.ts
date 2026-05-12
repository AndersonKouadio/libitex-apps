import { stripHtml } from "./strip-html";

describe("stripHtml", () => {
  it("retourne undefined si input null/undefined", () => {
    expect(stripHtml(null)).toBeUndefined();
    expect(stripHtml(undefined)).toBeUndefined();
  });

  it("retourne undefined si input non-string", () => {
    expect(stripHtml(42 as any)).toBeUndefined();
  });

  it("ne touche pas un texte plat", () => {
    expect(stripHtml("Bonjour le monde")).toBe("Bonjour le monde");
  });

  it("strip les balises HTML simples", () => {
    expect(stripHtml("<b>Gras</b>")).toBe("Gras");
    expect(stripHtml("<p>Hello</p>")).toBe("Hello");
  });

  it("strip les balises script (le critique XSS)", () => {
    expect(stripHtml('<script>alert("xss")</script>Texte'))
      .toBe('alert("xss")Texte');
    // Le contenu du script reste mais sans tags => execution impossible
  });

  it("strip les attributs HTML dans les balises", () => {
    expect(stripHtml('<a href="javascript:alert(1)" onclick="evil()">Clic</a>'))
      .toBe("Clic");
  });

  it("strip les balises img / svg / iframe", () => {
    expect(stripHtml('<img src=x onerror=alert(1)>'))
      .toBe("");
    expect(stripHtml('<iframe src="evil.com"></iframe>Texte'))
      .toBe("Texte");
  });

  it("decode les entites HTML courantes", () => {
    expect(stripHtml("&lt;b&gt;Gras&lt;/b&gt;")).toBe("<b>Gras</b>");
    expect(stripHtml("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(stripHtml("&quot;Hello&quot;")).toBe('"Hello"');
    expect(stripHtml("L&#39;Atelier")).toBe("L'Atelier");
  });

  it("strip les caracteres de controle invisibles", () => {
    expect(stripHtml("Texte\x00avec\x01null")).toBe("Texteavecnull");
  });

  it("preserve newlines et tab", () => {
    expect(stripHtml("Ligne 1\nLigne 2\tcolonne")).toBe("Ligne 1\nLigne 2\tcolonne");
  });

  it("trim le resultat final", () => {
    expect(stripHtml("   espaces   ")).toBe("espaces");
    expect(stripHtml("\n\nLigne\n\n")).toBe("Ligne");
  });

  it("gere les balises mal formees ou imbriquees", () => {
    expect(stripHtml("<b><i>Double</i></b>")).toBe("Double");
    expect(stripHtml("<unclosed tag")).toBe("<unclosed tag"); // pas de > donc pas reconnu
  });

  it("strip une attaque XSS classique", () => {
    const input = '<img src="x" onerror="document.cookie=alert(1)">Nom du produit';
    expect(stripHtml(input)).toBe("Nom du produit");
  });
});
