import { WhatsAppMetaProvider } from "./whatsapp-meta.provider";

describe("WhatsAppMetaProvider.normaliserNumero", () => {
  it("accepte un numero deja en E.164 sans +", () => {
    expect(WhatsAppMetaProvider.normaliserNumero("22507123456")).toBe("22507123456");
  });

  it("retire le +", () => {
    expect(WhatsAppMetaProvider.normaliserNumero("+225 07 12 34 56 78")).toBe("22507123456789".slice(0, 13));
  });

  it("retire le prefixe 00 (notation internationale)", () => {
    expect(WhatsAppMetaProvider.normaliserNumero("0022507123456")).toBe("22507123456");
  });

  it("retire espaces, tirets, points, parentheses", () => {
    expect(WhatsAppMetaProvider.normaliserNumero("+225 (07) 12-34.56 78"))
      .toBe(WhatsAppMetaProvider.normaliserNumero("+225071234.5678"));
  });

  it("rejette les numeros trop courts (< 8 chiffres)", () => {
    expect(WhatsAppMetaProvider.normaliserNumero("123")).toBeNull();
    expect(WhatsAppMetaProvider.normaliserNumero("")).toBeNull();
    expect(WhatsAppMetaProvider.normaliserNumero("abc")).toBeNull();
  });

  it("garde uniquement les chiffres meme avec lettres melangees", () => {
    expect(WhatsAppMetaProvider.normaliserNumero("+225-tel-0712345678")).toBe("2250712345678");
  });
});

describe("WhatsAppMetaProvider disponibilite", () => {
  function makeProvider(env: Record<string, string | undefined>) {
    const config = {
      get: (key: string) => env[key],
    } as any;
    return new WhatsAppMetaProvider(config);
  }

  it("est indisponible sans token ni phoneId", () => {
    const p = makeProvider({});
    expect(p.disponible).toBe(false);
  });

  it("est indisponible avec token mais sans phoneId", () => {
    const p = makeProvider({ WHATSAPP_TOKEN: "abc" });
    expect(p.disponible).toBe(false);
  });

  it("est disponible avec token + phoneId", () => {
    const p = makeProvider({ WHATSAPP_TOKEN: "abc", WHATSAPP_PHONE_ID: "123" });
    expect(p.disponible).toBe(true);
  });

  it("en mode fallback (sans token) retourne succes=true et log uniquement", async () => {
    const p = makeProvider({});
    const r = await p.envoyer({ destinataire: "+22507123456", texte: "hello" });
    expect(r.succes).toBe(true);
    expect(r.providerMessageId).toMatch(/^dev:/);
  });

  it("rejette un numero invalide meme en mode fallback", async () => {
    const p = makeProvider({});
    const r = await p.envoyer({ destinataire: "abc", texte: "hello" });
    expect(r.succes).toBe(false);
    expect(r.erreur).toContain("Numero invalide");
  });
});
