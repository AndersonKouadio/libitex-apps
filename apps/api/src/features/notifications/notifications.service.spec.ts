import { NotificationsService } from "./notifications.service";

/**
 * Module 10 D1 : tests integres legers du NotificationsService.
 * On mocke les providers et le repo log pour verifier le flow :
 * - log pending puis sent en cas de succes
 * - log pending puis failed en cas d'echec
 * - anti-doublon respecte
 * - exception du provider absorbee (jamais throw)
 */
describe("NotificationsService", () => {
  function setup(opts: {
    providerSucces?: boolean;
    providerErreur?: string;
    providerThrow?: Error;
    dejaEnvoye?: boolean;
  } = {}) {
    const whatsapp = {
      canal: "whatsapp" as const,
      disponible: true,
      envoyer: jest.fn(async () => {
        if (opts.providerThrow) throw opts.providerThrow;
        return opts.providerSucces === false
          ? { succes: false, erreur: opts.providerErreur ?? "echec" }
          : { succes: true, providerMessageId: "wamid.123" };
      }),
    };
    const email = {
      canal: "email" as const,
      disponible: true,
      envoyer: jest.fn(async () => ({ succes: true })),
    };
    const logs = {
      inserer: jest.fn(async () => ({ id: "log-1" })),
      marquerEnvoye: jest.fn(async () => {}),
      marquerEchoue: jest.fn(async () => {}),
      dejaEnvoye: jest.fn(async () => Boolean(opts.dejaEnvoye)),
      lister: jest.fn(async () => []),
    };
    const service = new NotificationsService(whatsapp as any, email as any, logs as any);
    return { service, whatsapp, email, logs };
  }

  it("retourne true et log sent en cas de succes", async () => {
    const { service, whatsapp, logs } = setup({ providerSucces: true });
    const ok = await service.envoyer({
      tenantId: "T", canal: "whatsapp", type: "ticket",
      destinataire: "22507123456", texte: "hello",
    });
    expect(ok).toBe(true);
    expect(whatsapp.envoyer).toHaveBeenCalledTimes(1);
    expect(logs.inserer).toHaveBeenCalledWith(expect.objectContaining({ status: "pending" }));
    expect(logs.marquerEnvoye).toHaveBeenCalledWith("log-1", "wamid.123");
    expect(logs.marquerEchoue).not.toHaveBeenCalled();
  });

  it("retourne false et log failed en cas d'echec provider", async () => {
    const { service, logs } = setup({ providerSucces: false, providerErreur: "rate limit" });
    const ok = await service.envoyer({
      tenantId: "T", canal: "whatsapp", type: "ticket",
      destinataire: "22507123456", texte: "hello",
    });
    expect(ok).toBe(false);
    expect(logs.marquerEchoue).toHaveBeenCalledWith("log-1", "rate limit");
  });

  it("absorbe une exception du provider et retourne false sans throw", async () => {
    const { service } = setup({ providerThrow: new Error("network down") });
    // Doit pas throw — le service appelant continue son flow metier
    await expect(service.envoyer({
      tenantId: "T", canal: "whatsapp", type: "ticket",
      destinataire: "22507123456", texte: "hello",
    })).resolves.toBe(false);
  });

  it("skip l'envoi si antiDoublon=true et deja envoye", async () => {
    const { service, whatsapp, logs } = setup({ dejaEnvoye: true });
    const ok = await service.envoyer({
      tenantId: "T", canal: "whatsapp", type: "ticket",
      destinataire: "22507123456", texte: "hello",
      entityType: "TICKET", entityId: "ticket-1", antiDoublon: true,
    });
    expect(ok).toBe(false);
    expect(whatsapp.envoyer).not.toHaveBeenCalled();
    expect(logs.inserer).not.toHaveBeenCalled();
  });

  it("envoie quand meme si antiDoublon=true mais pas encore envoye", async () => {
    const { service, whatsapp } = setup({ dejaEnvoye: false, providerSucces: true });
    const ok = await service.envoyer({
      tenantId: "T", canal: "whatsapp", type: "ticket",
      destinataire: "22507123456", texte: "hello",
      entityType: "TICKET", entityId: "ticket-1", antiDoublon: true,
    });
    expect(ok).toBe(true);
    expect(whatsapp.envoyer).toHaveBeenCalledTimes(1);
  });

  it("utilise le provider email pour canal=email", async () => {
    const { service, email, whatsapp } = setup({ providerSucces: true });
    const ok = await service.envoyer({
      tenantId: "T", canal: "email", type: "promo",
      destinataire: "a@b.c", texte: "promo", sujet: "Promo",
    });
    expect(ok).toBe(true);
    expect(email.envoyer).toHaveBeenCalledTimes(1);
    expect(whatsapp.envoyer).not.toHaveBeenCalled();
  });
});
