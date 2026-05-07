"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { catalog, stock, pos } from "@/lib/api";
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Smartphone, Banknote, PauseCircle, X,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  productType: string;
  variants: Variant[];
}

interface Variant {
  id: string;
  sku: string;
  name: string | null;
  priceRetail: string;
  attributes: Record<string, string>;
}

interface CartItem {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Location {
  id: string;
  name: string;
}

export default function PosPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  // Load products & locations
  useEffect(() => {
    if (!token) return;
    (async () => {
      const [prods, locs] = await Promise.all([
        catalog.listProducts(token),
        stock.listLocations(token),
      ]);
      setProducts(
        await Promise.all(
          prods.data.map((p: any) => catalog.getProduct(token!, p.id))
        )
      );
      setLocations(locs);
      if (locs.length > 0) setSelectedLocation(locs[0].id);
    })();
  }, [token]);

  // Add to cart
  const addToCart = useCallback((product: Product, variant: Variant) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === variant.id);
      if (existing) {
        return prev.map((item) =>
          item.variantId === variant.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                lineTotal: (item.quantity + 1) * item.unitPrice,
              }
            : item
        );
      }
      const price = Number(variant.priceRetail);
      return [
        ...prev,
        {
          variantId: variant.id,
          productName: product.name,
          variantName: variant.name || variant.sku,
          sku: variant.sku,
          quantity: 1,
          unitPrice: price,
          lineTotal: price,
        },
      ];
    });
  }, []);

  const updateQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.variantId === variantId
            ? {
                ...item,
                quantity: item.quantity + delta,
                lineTotal: (item.quantity + delta) * item.unitPrice,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

  // Complete sale
  const completeSale = async (method: string) => {
    if (!token || !selectedLocation || cart.length === 0) return;
    setProcessing(true);
    try {
      // Create ticket
      const ticket = await pos.createTicket(token, {
        locationId: selectedLocation,
        lines: cart.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      });

      // Complete with payment
      const completed = await pos.completeTicket(token, ticket.id, {
        payments: [{ method, amount: Number(ticket.total) }],
      });

      setLastSale(completed);
      setCart([]);
      setShowPayment(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Filter products
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.variants.some((v) => v.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ marginLeft: 0 }}>
      {/* ─── Products Grid (Left) ─── */}
      <div className="flex-1 flex flex-col bg-neutral-50 overflow-hidden">
        {/* POS Header */}
        <div
          className="h-14 flex items-center justify-between px-4 border-b bg-white shrink-0"
          style={{ borderColor: "var(--color-neutral-200)" }}
        >
          <div className="flex items-center gap-3">
            <ShoppingCart size={20} style={{ color: "var(--color-accent-600)" }} />
            <span className="font-semibold" style={{ color: "var(--color-primary-900)" }}>
              Point de Vente
            </span>
          </div>

          {/* Location selector */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm"
            style={{ borderColor: "var(--color-neutral-200)" }}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="px-4 py-3 shrink-0">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white"
            style={{ borderColor: "var(--color-neutral-200)" }}
          >
            <Search size={18} style={{ color: "var(--color-neutral-400)" }} />
            <input
              type="text"
              placeholder="Rechercher un produit ou scanner un code-barres..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((product) =>
              product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => addToCart(product, variant)}
                  className="bg-white rounded-lg border p-3 text-left hover:shadow-md hover:border-[var(--color-accent-400)] transition-all group"
                  style={{ borderColor: "var(--color-neutral-200)" }}
                >
                  <div
                    className="text-sm font-medium truncate group-hover:text-[var(--color-accent-600)]"
                    style={{ color: "var(--color-neutral-800)" }}
                  >
                    {product.name}
                  </div>
                  {variant.name && (
                    <div className="text-xs mt-0.5 truncate" style={{ color: "var(--color-neutral-500)" }}>
                      {variant.name}
                    </div>
                  )}
                  <div className="text-xs mt-0.5" style={{ color: "var(--color-neutral-400)" }}>
                    {variant.sku}
                  </div>
                  <div
                    className="text-base font-bold mt-2"
                    style={{ color: "var(--color-primary-900)" }}
                  >
                    {fmt(Number(variant.priceRetail))} <span className="text-xs font-normal">XOF</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── Cart (Right) ─── */}
      <div
        className="w-[380px] flex flex-col bg-white border-l shrink-0"
        style={{ borderColor: "var(--color-neutral-200)" }}
      >
        {/* Cart Header */}
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-neutral-200)" }}>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm" style={{ color: "var(--color-neutral-800)" }}>
              Panier ({cart.length})
            </span>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs px-2 py-1 rounded hover:bg-red-50"
                style={{ color: "var(--color-error)" }}
              >
                Vider
              </button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <ShoppingCart size={40} style={{ color: "var(--color-neutral-300)" }} />
              <p className="mt-3 text-sm" style={{ color: "var(--color-neutral-400)" }}>
                Le panier est vide
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-neutral-400)" }}>
                Cliquez sur un produit pour l'ajouter
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--color-neutral-100)" }}>
              {cart.map((item) => (
                <div key={item.variantId} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: "var(--color-neutral-800)" }}>
                        {item.productName}
                      </div>
                      <div className="text-xs" style={{ color: "var(--color-neutral-500)" }}>
                        {item.variantName} - {item.sku}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.variantId)}
                      className="p-1 rounded hover:bg-red-50 shrink-0 ml-2"
                      style={{ color: "var(--color-neutral-400)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.variantId, -1)}
                        className="w-7 h-7 rounded-md border flex items-center justify-center hover:bg-neutral-50"
                        style={{ borderColor: "var(--color-neutral-200)" }}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-semibold w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.variantId, 1)}
                        className="w-7 h-7 rounded-md border flex items-center justify-center hover:bg-neutral-50"
                        style={{ borderColor: "var(--color-neutral-200)" }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-sm font-bold" style={{ color: "var(--color-primary-900)" }}>
                      {fmt(item.lineTotal)} XOF
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        <div className="border-t p-4 space-y-3" style={{ borderColor: "var(--color-neutral-200)" }}>
          {/* Total */}
          <div
            className="flex items-center justify-between py-3 px-4 rounded-lg"
            style={{ background: "var(--color-primary-900)" }}
          >
            <span className="text-sm text-white/70">TOTAL</span>
            <span className="text-2xl font-bold text-white">{fmt(cartTotal)} <span className="text-sm">XOF</span></span>
          </div>

          {/* Payment Buttons */}
          {!showPayment ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowPayment(true)}
                disabled={cart.length === 0}
                className="flex-1 py-3 rounded-lg text-white text-sm font-semibold disabled:opacity-40 transition-colors"
                style={{ background: "var(--color-accent-600)" }}
              >
                Encaisser
              </button>
              <button
                disabled={cart.length === 0}
                className="px-3 py-3 rounded-lg border text-sm disabled:opacity-40"
                style={{
                  borderColor: "var(--color-warm-500)",
                  color: "var(--color-warm-500)",
                }}
                title="Mettre en attente"
              >
                <PauseCircle size={20} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: "var(--color-neutral-700)" }}>
                  Mode de paiement
                </span>
                <button onClick={() => setShowPayment(false)}>
                  <X size={16} style={{ color: "var(--color-neutral-400)" }} />
                </button>
              </div>
              {[
                { method: "CASH", label: "Especes", icon: Banknote, color: "var(--color-success)" },
                { method: "MOBILE_MONEY", label: "Mobile Money", icon: Smartphone, color: "var(--color-warm-500)" },
                { method: "CARD", label: "Carte Bancaire", icon: CreditCard, color: "var(--color-info)" },
              ].map((pm) => (
                <button
                  key={pm.method}
                  onClick={() => completeSale(pm.method)}
                  disabled={processing}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium hover:shadow-sm transition-all disabled:opacity-50"
                  style={{ borderColor: "var(--color-neutral-200)" }}
                >
                  <pm.icon size={20} style={{ color: pm.color }} />
                  <span style={{ color: "var(--color-neutral-700)" }}>{pm.label}</span>
                  <span className="ml-auto font-bold" style={{ color: "var(--color-primary-900)" }}>
                    {fmt(cartTotal)} XOF
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Sale Confirmation Modal ─── */}
      {lastSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--color-success-light)" }}
            >
              <ShoppingCart size={28} style={{ color: "var(--color-success)" }} />
            </div>
            <h3 className="text-xl font-bold" style={{ color: "var(--color-neutral-800)" }}>
              Vente completee !
            </h3>
            <p className="text-sm mt-2" style={{ color: "var(--color-neutral-500)" }}>
              Ticket {lastSale.ticketNumber}
            </p>
            <p
              className="text-3xl font-bold mt-3"
              style={{ color: "var(--color-accent-600)" }}
            >
              {fmt(Number(lastSale.total))} XOF
            </p>
            {lastSale.change > 0 && (
              <p className="text-sm mt-1" style={{ color: "var(--color-warm-500)" }}>
                Monnaie : {fmt(lastSale.change)} XOF
              </p>
            )}
            <button
              onClick={() => setLastSale(null)}
              className="mt-6 w-full py-3 rounded-lg text-white text-sm font-semibold"
              style={{ background: "var(--color-accent-600)" }}
            >
              Nouvelle vente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
