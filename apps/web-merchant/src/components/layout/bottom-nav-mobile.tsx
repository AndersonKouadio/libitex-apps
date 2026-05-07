"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse, MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

interface ItemNav {
  href: string;
  libelle: string;
  icone: LucideIcon;
  match?: (path: string) => boolean;
}

const ITEMS: ItemNav[] = [
  { href: "/dashboard", libelle: "Accueil", icone: LayoutDashboard },
  { href: "/pos", libelle: "Caisse", icone: ShoppingCart },
  { href: "/catalogue", libelle: "Catalogue", icone: Package },
  { href: "/stock", libelle: "Stock", icone: Warehouse },
];

interface Props {
  onPlus: () => void;
}

export function BottomNavMobile({ onPlus }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border safe-bottom lg:hidden"
      aria-label="Navigation principale"
    >
      <ul className="flex items-stretch h-16">
        {ITEMS.map((item) => {
          const actif = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icone = item.icone;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`h-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  actif ? "text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                <Icone size={20} strokeWidth={actif ? 2.2 : 1.6} />
                <span className="text-[10px] font-medium">{item.libelle}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={onPlus}
            className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-muted hover:text-foreground transition-colors"
          >
            <MoreHorizontal size={20} strokeWidth={1.6} />
            <span className="text-[10px] font-medium">Plus</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
