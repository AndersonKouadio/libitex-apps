"use client";

import { MapPin, Phone, Mail } from "lucide-react";
import type { IBoutiquePublic } from "../types/showcase.type";

interface Props {
  boutique: IBoutiquePublic;
}

export function HeaderBoutique({ boutique }: Props) {
  // Numero international sans + ni espaces pour wa.me
  const numeroBrut = boutique.telephone?.replace(/[^\d]/g, "");
  const lienWhatsApp = numeroBrut ? `https://wa.me/${numeroBrut}` : null;
  const lienTel = boutique.telephone ? `tel:${boutique.telephone.replace(/\s/g, "")}` : null;
  const lienMail = boutique.email ? `mailto:${boutique.email}` : null;

  return (
    <header className="bg-surface border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
        <div className="flex items-start gap-4 flex-wrap">
          {boutique.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={boutique.logoUrl}
              alt={boutique.nom}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0"
            />
          ) : (
            <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-accent/10 text-accent text-3xl font-bold flex items-center justify-center shrink-0">
              {boutique.nom[0]?.toUpperCase() ?? "?"}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{boutique.nom}</h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {boutique.adresse && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {boutique.adresse}
                </span>
              )}
              {boutique.telephone && (
                <a
                  href={lienTel!}
                  className="flex items-center gap-1.5 hover:text-accent"
                >
                  <Phone size={14} /> {boutique.telephone}
                </a>
              )}
              {boutique.email && (
                <a
                  href={lienMail!}
                  className="flex items-center gap-1.5 hover:text-accent"
                >
                  <Mail size={14} /> {boutique.email}
                </a>
              )}
            </div>
            {lienWhatsApp && (
              <a
                href={lienWhatsApp}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-success text-success-foreground hover:brightness-95"
              >
                <Phone size={14} /> Commander sur WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
