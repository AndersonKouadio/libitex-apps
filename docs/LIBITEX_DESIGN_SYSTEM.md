# LIBITEX Design System

## Brand Identity & Visual Guidelines

**Version**: 1.0
**Date**: April 7, 2026

---

## 1. Brand Essence

### Brand Personality
LIBITEX is **reliable**, **modern**, and **empowering**. It bridges the gap between enterprise-grade software and the everyday reality of African commerce. The brand should feel:

- **Trustworthy** — merchants entrust their entire business to this platform
- **Accessible** — not intimidating, welcoming to first-time ERP users
- **Professional** — inspires confidence with investors and B2B clients
- **Energetic** — reflects the dynamism of African commerce

### Brand Voice
- Clear, direct, jargon-free
- Confident but not arrogant
- Helpful and instructive
- Culturally respectful

### Tagline Options
- *Commerce. Simplified.*
- *From Source to Sale.*
- *Your Business, Connected.*

---

## 2. Logo

### Primary Logo
The LIBITEX wordmark uses a custom geometric sans-serif typeface. The "X" features a subtle crosshair motif representing precision and tracking — core values of an ERP system.

### Logo Variations
| Variant | Usage |
|---------|-------|
| **Full color on light** | Primary usage on white/light backgrounds |
| **Full color on dark** | For dark headers, cover pages, login screens |
| **Monochrome white** | On colored backgrounds, overlays |
| **Monochrome dark** | For print, fax, grayscale documents |
| **Icon only** | Favicon, app icon, small spaces |

### Logo Clear Space
Minimum clear space around the logo = height of the "L" character on all sides.

### Minimum Size
- Print: 25mm wide
- Screen: 80px wide

---

## 3. Color Palette

### 3.1 Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Indigo 900** (Primary) | `#1B1F3B` | 27, 31, 59 | Headers, primary text, nav bars |
| **Indigo 700** | `#2D3561` | 45, 53, 97 | Active states, secondary headers |
| **Teal 600** (Accent) | `#0D9488` | 13, 148, 136 | CTAs, links, interactive elements |
| **Teal 400** | `#2DD4BF` | 45, 212, 191 | Hover states, highlights, badges |

**Why Indigo + Teal**: Indigo conveys trust and depth (finance, enterprise). Teal injects energy and modernity without the overused "startup blue". Together they feel premium yet approachable.

### 3.2 Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Amber 500** (Warm Accent) | `#F59E0B` | 245, 158, 11 | Warnings, highlights, gold badges |
| **Amber 300** | `#FCD34D` | 252, 211, 77 | Light accent, notification dots |
| **Slate 800** | `#1E293B` | 30, 41, 59 | Body text, dark UI elements |
| **Slate 500** | `#64748B` | 100, 116, 139 | Secondary text, placeholders |
| **Slate 200** | `#E2E8F0` | 226, 232, 240 | Borders, dividers, table lines |
| **Slate 50** | `#F8FAFC` | 248, 250, 252 | Page backgrounds, card fills |

### 3.3 Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Success** | `#059669` | Confirmed sales, stock OK, sync complete |
| **Success Light** | `#D1FAE5` | Success backgrounds |
| **Warning** | `#D97706` | Low stock, pending sync, expiry approaching |
| **Warning Light** | `#FEF3C7` | Warning backgrounds |
| **Error** | `#DC2626` | Failed transactions, stock negative, errors |
| **Error Light** | `#FEE2E2` | Error backgrounds |
| **Info** | `#2563EB` | Informational messages, tips |
| **Info Light** | `#DBEAFE` | Info backgrounds |

### 3.4 POS-Specific Colors

The POS interface uses high-contrast colors for speed and readability under varied lighting (bright shops, outdoor markets):

| Name | Hex | Usage |
|------|-----|-------|
| **POS Background** | `#FFFFFF` | White canvas for maximum contrast |
| **POS Card** | `#F1F5F9` | Product cards, category tiles |
| **POS Accent** | `#0D9488` | Add to cart, confirm sale |
| **POS Danger** | `#EF4444` | Void, cancel, delete |
| **POS Hold** | `#F59E0B` | Park/hold ticket |
| **POS Payment** | `#1B1F3B` | Payment modal, total display |

### 3.5 E-Commerce Colors

The marketplace and boutique storefronts use a warmer palette to encourage purchasing:

| Name | Hex | Usage |
|------|-----|-------|
| **Storefront BG** | `#FAFAF9` | Warm white background |
| **Product Card** | `#FFFFFF` | Clean white product cards |
| **Buy CTA** | `#0D9488` | Add to cart, buy now |
| **Price** | `#1B1F3B` | Price display (bold, prominent) |
| **Sale Price** | `#DC2626` | Discounted price (red) |
| **Original Price** | `#94A3B8` | Struck-through original price |

### 3.6 Dark Mode

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Background | `#FFFFFF` | `#0F172A` |
| Surface | `#F8FAFC` | `#1E293B` |
| Surface Elevated | `#FFFFFF` | `#334155` |
| Primary Text | `#1E293B` | `#F1F5F9` |
| Secondary Text | `#64748B` | `#94A3B8` |
| Border | `#E2E8F0` | `#334155` |
| Primary Accent | `#0D9488` | `#2DD4BF` |

---

## 4. Typography

### 4.1 Font Stack

| Role | Font | Fallback | Weight |
|------|------|----------|--------|
| **Headings** | Inter | system-ui, sans-serif | 600 (SemiBold), 700 (Bold) |
| **Body** | Inter | system-ui, sans-serif | 400 (Regular), 500 (Medium) |
| **Monospace** | JetBrains Mono | ui-monospace, monospace | 400, 500 |
| **POS Display** | Inter | system-ui, sans-serif | 700 (Bold) |

**Why Inter**: Excellent legibility at all sizes, extensive language support (French, Arabic, CJK for product names), open source, variable font for performance.

### 4.2 Type Scale

| Name | Size | Line Height | Weight | Usage |
|------|------|-------------|--------|-------|
| **Display** | 36px / 2.25rem | 1.2 | 700 | Landing page hero, marketing |
| **H1** | 30px / 1.875rem | 1.25 | 700 | Page titles |
| **H2** | 24px / 1.5rem | 1.3 | 600 | Section headers |
| **H3** | 20px / 1.25rem | 1.35 | 600 | Subsection headers |
| **H4** | 16px / 1rem | 1.4 | 600 | Card headers, labels |
| **Body LG** | 16px / 1rem | 1.6 | 400 | Lead paragraphs |
| **Body** | 14px / 0.875rem | 1.5 | 400 | Default body text |
| **Body SM** | 13px / 0.8125rem | 1.5 | 400 | Table cells, secondary info |
| **Caption** | 12px / 0.75rem | 1.4 | 400 | Timestamps, helper text |
| **Overline** | 11px / 0.6875rem | 1.5 | 600 | Labels, badges, uppercase |

### 4.3 POS Typography (Larger for touch/distance)

| Element | Size | Weight |
|---------|------|--------|
| Total amount | 48px | 700 |
| Product name in cart | 18px | 500 |
| Price in cart | 18px | 700 |
| Category label | 16px | 600 |
| Product card name | 14px | 500 |
| Product card price | 16px | 700 |

---

## 5. Spacing & Layout

### 5.1 Spacing Scale (base: 4px)

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | — |
| `space-1` | 4px | Tight inline spacing |
| `space-2` | 8px | Icon-to-text, compact padding |
| `space-3` | 12px | Default inner padding |
| `space-4` | 16px | Card padding, form gaps |
| `space-5` | 20px | Section inner padding |
| `space-6` | 24px | Section gaps |
| `space-8` | 32px | Page section gaps |
| `space-10` | 40px | Major section separation |
| `space-12` | 48px | Page-level padding |
| `space-16` | 64px | Hero sections |

### 5.2 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Buttons, inputs, small badges |
| `radius-md` | 8px | Cards, modals, dropdowns |
| `radius-lg` | 12px | Large cards, containers |
| `radius-xl` | 16px | Hero sections, feature cards |
| `radius-full` | 9999px | Avatars, circular badges, pills |

### 5.3 Grid System

| Context | Columns | Gutter | Margin |
|---------|---------|--------|--------|
| **Desktop (>1280px)** | 12 | 24px | 32px |
| **Tablet (768-1279px)** | 8 | 16px | 24px |
| **Mobile (<768px)** | 4 | 16px | 16px |
| **POS (full screen)** | Custom flex | 12px | 8px |

### 5.4 Breakpoints

| Name | Min Width | Target |
|------|-----------|--------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

---

## 6. Shadows & Elevation

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift (inputs, tags) |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.1)` | Cards, dropdowns |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Popovers, floating elements |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dialogs |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.1)` | Overlay panels |

---

## 7. Iconography

### Icon Library
**Lucide Icons** (open source, consistent, 1000+ icons)

### Icon Sizes

| Size | Pixels | Usage |
|------|--------|-------|
| `xs` | 14px | Inline with small text |
| `sm` | 16px | Inline with body text, table actions |
| `md` | 20px | Navigation items, buttons |
| `lg` | 24px | Page headers, feature icons |
| `xl` | 32px | Dashboard cards, empty states |
| `2xl` | 48px | Onboarding, marketing |

### Icon Style Rules
- Stroke width: 1.5px (default) — 2px for POS (better touch visibility)
- Always paired with a text label in navigation (no icon-only nav items)
- Color: inherit from parent text color, or use semantic colors for status

### Key Module Icons

| Module | Icon | Lucide Name |
|--------|------|-------------|
| Dashboard | Grid layout | `layout-dashboard` |
| POS / Sales | Shopping cart | `shopping-cart` |
| Catalogue | Package | `package` |
| Inventory | Warehouse | `warehouse` |
| Purchases | Truck | `truck` |
| Clients | Users | `users` |
| Reports | Bar chart | `bar-chart-3` |
| Settings | Cog | `settings` |
| E-Commerce | Globe | `globe` |
| Finance | Wallet | `wallet` |

---

## 8. Components

### 8.1 Buttons

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| **Primary** | Teal 600 | White | — | Main actions (Save, Confirm, Add to Cart) |
| **Secondary** | Transparent | Teal 600 | Teal 600 | Secondary actions (Cancel, Back) |
| **Ghost** | Transparent | Slate 700 | — | Tertiary actions, inline links |
| **Danger** | Error | White | — | Destructive actions (Delete, Void) |
| **POS Primary** | Teal 600 | White | — | Large, min-height 56px for touch |
| **POS Danger** | Error | White | — | Large, min-height 56px |

**Button Sizes:**
| Size | Height | Padding X | Font Size |
|------|--------|-----------|-----------|
| `sm` | 32px | 12px | 13px |
| `md` | 40px | 16px | 14px |
| `lg` | 48px | 24px | 16px |
| `pos` | 56px | 24px | 18px |

### 8.2 Inputs

| State | Border | Background | Shadow |
|-------|--------|------------|--------|
| **Default** | Slate 200 | White | None |
| **Hover** | Slate 300 | White | xs |
| **Focus** | Teal 600 (2px) | White | `0 0 0 3px rgba(13,148,136,0.15)` |
| **Error** | Error | Error Light | `0 0 0 3px rgba(220,38,38,0.15)` |
| **Disabled** | Slate 200 | Slate 50 | None |

- Height: 40px (default), 48px (POS)
- Border radius: `radius-sm` (4px)
- Padding: 12px horizontal

### 8.3 Cards

```
Background:    White (light mode) / Slate 800 (dark mode)
Border:        1px Slate 200
Border Radius: radius-md (8px)
Shadow:        shadow-sm
Padding:       space-4 (16px)
Hover:         shadow-md (for clickable cards)
```

### 8.4 Tables

| Element | Style |
|---------|-------|
| Header row | BG: Indigo 900, Text: White, Font: 600 |
| Body row | BG: White, Text: Slate 800 |
| Alt row | BG: Slate 50 |
| Hover row | BG: Teal 50 (`#F0FDFA`) |
| Border | 1px Slate 200 between rows |
| Cell padding | 12px vertical, 16px horizontal |

### 8.5 Badges & Status

| Status | Background | Text | Dot |
|--------|-----------|------|-----|
| **Active / Paid** | Success Light | Success | Green |
| **Pending / Processing** | Warning Light | Warning | Amber |
| **Failed / Overdue** | Error Light | Error | Red |
| **Draft** | Slate 100 | Slate 600 | Gray |
| **Info** | Info Light | Info | Blue |

### 8.6 Navigation

**Sidebar (Back-Office / ERP):**
- Width: 256px (expanded), 72px (collapsed)
- Background: Indigo 900
- Text: White (active), Slate 400 (inactive)
- Active indicator: Teal 400 left border (3px) + Teal 900 background tint
- Hover: Indigo 700 background

**Top Bar:**
- Height: 56px
- Background: White
- Shadow: shadow-xs
- Contains: breadcrumbs, search, notifications, user menu

---

## 9. Layout Patterns

### 9.1 Back-Office / ERP Layout

```
┌──────────────────────────────────────────────────┐
│  Sidebar (256px)  │  Top Bar (56px)               │
│                   │───────────────────────────────│
│  Logo             │  Breadcrumbs    Search  User  │
│  ─────            │───────────────────────────────│
│  Dashboard        │                               │
│  POS Mode >>>>    │         Main Content          │
│  Catalogue        │                               │
│  Inventory        │   ┌─────────┐  ┌──────────┐  │
│  Purchases        │   │  Card   │  │  Card    │  │
│  Sales (B2B)      │   └─────────┘  └──────────┘  │
│  Clients          │                               │
│  E-Commerce       │   ┌──────────────────────┐   │
│  Reports          │   │    Table / List       │   │
│  ─────            │   └──────────────────────┘   │
│  Settings         │                               │
└──────────────────────────────────────────────────┘
```

### 9.2 POS Layout (Full Screen Mode)

```
┌──────────────────────────────────────────────────┐
│ ← Exit POS    Store Name          User    Clock  │
│──────────────────────────────────────────────────│
│                              │                   │
│   Categories (horizontal)    │    Cart            │
│   ─────────────────────────  │    ──────────────  │
│                              │    Item 1   $XX   │
│   ┌─────┐ ┌─────┐ ┌─────┐  │    Item 2   $XX   │
│   │Prod │ │Prod │ │Prod │  │    Item 3   $XX   │
│   │$XX  │ │$XX  │ │$XX  │  │                   │
│   └─────┘ └─────┘ └─────┘  │    ──────────────  │
│                              │    Subtotal  $XXX  │
│   ┌─────┐ ┌─────┐ ┌─────┐  │    Tax       $XX   │
│   │Prod │ │Prod │ │Prod │  │    ══════════════  │
│   │$XX  │ │$XX  │ │$XX  │  │    TOTAL    $XXXX  │
│   └─────┘ └─────┘ └─────┘  │                   │
│                              │   [Hold] [Pay Now] │
└──────────────────────────────────────────────────┘
```

### 9.3 E-Commerce / Marketplace Layout

```
┌──────────────────────────────────────────────────┐
│  Logo    Categories    Search         Cart  User  │
│──────────────────────────────────────────────────│
│                                                   │
│   Hero Banner / Promotions                        │
│                                                   │
│──────────────────────────────────────────────────│
│                                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│  │ Img  │ │ Img  │ │ Img  │ │ Img  │            │
│  │ Name │ │ Name │ │ Name │ │ Name │            │
│  │ $XX  │ │ $XX  │ │ $XX  │ │ $XX  │            │
│  │ Shop │ │ Shop │ │ Shop │ │ Shop │            │
│  └──────┘ └──────┘ └──────┘ └──────┘            │
│                                                   │
│──────────────────────────────────────────────────│
│  Footer: About | Terms | Contact | Socials        │
└──────────────────────────────────────────────────┘
```

---

## 10. Motion & Animation

### Principles
- **Purposeful**: every animation serves a function (feedback, orientation, focus)
- **Fast**: max 300ms for UI transitions, 150ms for micro-interactions
- **Subtle**: no bouncing, no overshooting, no gratuitous effects

### Timing

| Type | Duration | Easing | Example |
|------|----------|--------|---------|
| **Micro** | 100-150ms | `ease-out` | Button press, toggle, checkbox |
| **Standard** | 200-250ms | `ease-in-out` | Modal open, dropdown, sidebar |
| **Complex** | 300ms | `ease-in-out` | Page transition, panel slide |
| **Loading** | Infinite | `linear` | Spinner, skeleton pulse |

### CSS Variables

```css
--transition-fast: 150ms ease-out;
--transition-base: 200ms ease-in-out;
--transition-slow: 300ms ease-in-out;
```

### Key Animations
- **Sidebar collapse/expand**: 200ms width transition
- **Modal**: fade in 200ms + scale from 0.95
- **Toast notifications**: slide in from right 250ms, auto-dismiss 5s
- **POS cart item added**: brief scale pulse (1.02) on the cart total
- **Skeleton loading**: pulse animation on placeholder cards

---

## 11. Accessibility

### Standards
- **WCAG 2.1 AA** compliance minimum
- **AAA** for POS critical elements (total, payment buttons)

### Color Contrast
| Context | Minimum Ratio |
|---------|---------------|
| Body text on background | 4.5:1 |
| Large text (18px+) | 3:1 |
| Interactive elements | 3:1 against adjacent colors |
| POS amounts & buttons | 7:1 (AAA) |

### Focus States
- Visible focus ring: `2px solid Teal 600` with `3px offset`
- Never remove focus outlines — restyle them
- Tab order follows visual reading order

### Touch Targets
- Minimum: 44x44px (WCAG)
- POS: 56x56px minimum for all interactive elements
- Adequate spacing between tap targets (min 8px gap)

### Screen Reader Support
- All images: meaningful `alt` text or `aria-hidden`
- Form fields: associated `<label>` elements
- Status updates: `aria-live` regions for cart updates, notifications
- Navigation: ARIA landmarks (`main`, `nav`, `aside`)

---

## 12. Responsive Behavior

### Breakpoint Strategy

| Device | Width | Layout Changes |
|--------|-------|----------------|
| **Mobile** | <768px | Single column, bottom nav, stacked cards |
| **Tablet** | 768-1023px | Sidebar collapsed by default, 2-col grid |
| **Desktop** | 1024-1279px | Full sidebar, 3-col grid |
| **Large Desktop** | 1280px+ | Full sidebar, 4-col grid, wider content |

### POS Responsive
- **Tablet landscape (1024px+)**: Full POS layout (products left, cart right)
- **Tablet portrait (768px)**: Products top, cart bottom (scrollable)
- **Phone (<768px)**: Not recommended for POS — redirect to mobile app

### E-Commerce Responsive
- Product grid: 4 cols (XL) -> 3 cols (LG) -> 2 cols (MD) -> 1 col (SM)
- Filter sidebar: visible (LG+) -> slide-out drawer (MD-)
- Cart: sidebar (LG+) -> full page (MD-)

---

## 13. Data Visualization

### Chart Colors (ordered by usage)

| Order | Color | Hex |
|-------|-------|-----|
| 1 | Teal 600 | `#0D9488` |
| 2 | Indigo 700 | `#2D3561` |
| 3 | Amber 500 | `#F59E0B` |
| 4 | Rose 500 | `#F43F5E` |
| 5 | Violet 500 | `#8B5CF6` |
| 6 | Sky 500 | `#0EA5E9` |
| 7 | Emerald 500 | `#10B981` |
| 8 | Orange 500 | `#F97316` |

### Chart Guidelines
- Always label axes clearly
- Use a maximum of 6-7 colors in a single chart
- Include data labels on bar charts when space allows
- Default to bar charts for comparisons, line charts for trends
- Dashboard KPI cards: large number + trend arrow + mini sparkline

---

## 14. Print & Document Styling

### Thermal Receipt (80mm)

```
Width:        80mm (printable: 72mm)
Font:         Monospace, 10pt
Line spacing: 1.2
Sections:     Store header → Items → Totals → Payment → Footer
Logo:         Centered, max 48mm wide, grayscale bitmap
```

### A4 Documents (Invoices, Quotes, Delivery Notes)

| Element | Style |
|---------|-------|
| Header | Company logo (left) + document title (right), Indigo 900 accent line below |
| Body | Inter 10pt, Slate 800, 1.5 line height |
| Tables | Indigo 900 header, alternating Slate 50 rows |
| Footer | Page number, company info, legal mentions |
| Accent | Teal 600 for section dividers and highlights |

---

## 15. Design Tokens (CSS Custom Properties)

```css
:root {
  /* Primary */
  --color-primary-900: #1B1F3B;
  --color-primary-700: #2D3561;
  --color-primary-500: #4A51A0;

  /* Accent */
  --color-accent-600: #0D9488;
  --color-accent-400: #2DD4BF;
  --color-accent-100: #CCFBF1;

  /* Warm */
  --color-warm-500: #F59E0B;
  --color-warm-300: #FCD34D;
  --color-warm-100: #FEF3C7;

  /* Neutral */
  --color-neutral-900: #0F172A;
  --color-neutral-800: #1E293B;
  --color-neutral-700: #334155;
  --color-neutral-600: #475569;
  --color-neutral-500: #64748B;
  --color-neutral-400: #94A3B8;
  --color-neutral-300: #CBD5E1;
  --color-neutral-200: #E2E8F0;
  --color-neutral-100: #F1F5F9;
  --color-neutral-50: #F8FAFC;

  /* Semantic */
  --color-success: #059669;
  --color-success-light: #D1FAE5;
  --color-warning: #D97706;
  --color-warning-light: #FEF3C7;
  --color-error: #DC2626;
  --color-error-light: #FEE2E2;
  --color-info: #2563EB;
  --color-info-light: #DBEAFE;

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.1);

  /* Transitions */
  --transition-fast: 150ms ease-out;
  --transition-base: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
}
```

---

## 16. File & Asset Naming Convention

```
Icons:       icon-{name}-{size}.svg          (icon-cart-24.svg)
Images:      img-{context}-{description}.png (img-hero-dashboard.png)
Components:  PascalCase                      (ProductCard.tsx)
Tokens:      kebab-case                      (--color-primary-900)
CSS Modules: camelCase                       (productCard.module.css)
```
