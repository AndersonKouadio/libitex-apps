"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse,
  Users, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS", icon: ShoppingCart, highlight: true },
  { href: "/catalog", label: "Catalogue", icon: Package },
  { href: "/stock", label: "Stock", icon: Warehouse },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/reports", label: "Rapports", icon: BarChart3 },
  { href: "/settings", label: "Parametres", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col transition-all duration-200 z-40 ${
        collapsed ? "w-[72px]" : "w-[256px]"
      }`}
      style={{ background: "var(--color-primary-900)" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
        {!collapsed && (
          <span className="text-xl font-bold" style={{ color: "var(--color-accent-400)" }}>
            LIBITEX
          </span>
        )}
        {collapsed && (
          <span className="text-xl font-bold mx-auto" style={{ color: "var(--color-accent-400)" }}>
            L
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-white/10 text-white/60"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              } ${item.highlight && !isActive ? "text-[var(--color-accent-400)]" : ""}`}
              style={
                isActive
                  ? {
                      background: "var(--color-primary-700)",
                      borderLeft: "3px solid var(--color-accent-400)",
                    }
                  : undefined
              }
            >
              <Icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        {!collapsed && user && (
          <div className="px-3 mb-2 text-xs text-white/40 truncate">
            {user.role}
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 w-full"
        >
          <LogOut size={20} />
          {!collapsed && <span>Deconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
