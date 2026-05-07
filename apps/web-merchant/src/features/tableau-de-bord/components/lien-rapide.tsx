"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";

interface Props {
  href: string;
  icone: LucideIcon;
  libelle: string;
  classesIcone: string;
}

export function LienRapide({ href, icone: Icone, libelle, classesIcone }: Props) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-surface hover:border-foreground/20 hover:shadow-sm transition-all"
    >
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${classesIcone}`}>
        <Icone size={18} strokeWidth={1.8} />
      </span>
      <span className="text-sm font-medium text-foreground">{libelle}</span>
    </Link>
  );
}
