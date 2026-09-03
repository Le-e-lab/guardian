# Guardian Brand Guidelines

> Version 2.0 — 2026
> Source of truth for the Guardian brand identity, visual system, and voice.
> Supersedes the legacy "Sentari / warm editorial" v1.0 document.

---

## 1. Positioning (unchanged in substance, renamed)

Guardian is an **Africa-first, AI-native cybersecurity scanning platform** built in
Harare, Zimbabwe. A founder submits a URL and gets a plain-language report of what an
attacker would see, plus concrete fixes. We are the affordable first layer of defence.

- **Not** a compliance governance layer (that's Cybervergent)
- **Not** email-only security (that's Sendmarc)
- **Not** a Western pentesting tool with an Africa markup
- **Not** a neon "cyberpunk" cliché — we are a serious operations tool

Target markets: Zimbabwe (launch) → South Africa, Nigeria, Kenya → SADC expansion.

---

## 2. Visual Identity — "Ink & Signal"

The design language is **"Ink & Signal"**: a warm, graphite-neutral canvass (like a
well-lit security operations room, not a motherboard), with a single **burnt-amber
signal** accent that evokes alert lighting, warning tape, and a guard's beacon —
"safeguarding" made physical. It deliberately avoids the two most common AI-security
clichés: teal-on-navy and warm-cream/beige premium.

### Colour Palette

**Neutrals (warm graphite — one family, never mixed warm/cool)**

| Token | Hex | Role |
|-------|-----|------|
| brand-50  | #F7F4F0 | Lightest tint — page wash |
| brand-100 | #EFEAE3 | Card surfaces, section tints |
| brand-200 | #DED5C9 | Hairline borders, dividers |
| brand-300 | #BDB2A4 | Muted structural lines, scrollbar |
| brand-400 | #9B8F80 | Secondary text on light, disabled |
| brand-500 | #6E6256 | Primary neutral accent / secondary CTA |
| brand-600 | #524A41 | Strong text, hovers |
| brand-700 | #3D3731 | Headings on light |
| brand-800 | #2A2622 | Primary headings, near-ink |
| brand-900 | #1B1815 | Near-black ink |

**Signal accent (the ONE accent — burnt amber)**

| Token | Hex | Role |
|-------|-----|------|
| accent-400 | #E8823A | Hover / glow states on signal |
| accent-500 | #D96A1F | **Primary CTA, active states, key emphasis** |
| accent-600 | #B7531A | CTA hover, pressed |
| accent-700 | #8F4317 | Accent text on light |

**Surfaces**

| Token | Hex | Role |
|-------|-----|------|
| surface | #FAF8F5 | Page background (warm off-white, NOT pure white) |
| surface-raised | #FFFFFF | Elevated cards / inputs |
| dark-bg | #141210 | Dark sections + scanner (warm charcoal, NOT navy) |
| dark-surface | #1E1B18 | Dark card surface |
| dark-border | #2C2823 | Dark borders |
| dark-text | #F2EDE6 | Text on dark |

**Severity (unchanged — functional)**

critical #C62828 · high #E05B1B · medium #C77A10 · low #3B6FB0 · info #6B7280

> **Rule:** One accent only. Burnt-amber for action/emphasis. Neutrals carry the page.
> Never return to teal, cyan, or bright navy as the brand accent.

### Typography

| Role | Font |
|------|------|
| **Display / headlines** | `Space Grotesk` — geometric, technical, warm. Not Inter, not Funnel. |
| **Body / UI** | `Public Sans` — neutral, highly legible, warm-humane |
| **Mono (scanner data, findings, code)** | `JetBrains Mono` — the "engine readout" voice |

Rules:
- Display: tracking-tight, weight-driven hierarchy. NO gradient text on large headers.
- Body: relaxed leading, `max-w-[65ch]`.
- Numbers in scan results use the mono font (tabular for the "readout" feel).

### Logo & Mark

- **Masthead:** the wordmark "Guardian" set in Space Grotesk, tight tracking.
- **Mark:** a guard's **beacon signal** — a filled diamond with a concentric
  crosshair/vergence line (evokes a tracking beacon / a vigil lamp), NOT a literal
  shield. Tagline "see it. fix it." may sit small beneath.
- Use the beacon mark in burnt-amber on graphite, or inverted on dark.

### Layout & Motion

- Max width `max-w-7xl`; generous section padding `py-20 sm:py-24`.
- Asymmetric hero (left-aligned display, supporting proof on the right) — not a
  centered pill stack.
- Cards use a hairline `border-brand-200` on `brand-100`, generous radius `rounded-2xl`,
  diffused shadows tinted to the canvas (never pure-black shadows).
- Motion: custom cubic-bezier (`cubic-bezier(0.32,0.72,0,1)`), button `:active scale(0.97)`.
- Circular spinners allowed only for true loading; otherwise skeletal loaders.

---

## 3. Voice (retain from v1 — it is good)

- Specifics over superlatives. Mechanism first, impact second.
- No fake urgency, no fake social proof, no manufactured FOMO.
- African-market-native: reference EcoCash, CBZ, Econet, USSD, mobile money — don't explain them.
- Direct and compressed. Direct and compressed.
- Banned: game-changing, revolutionary, cutting-edge, leverage, synergy, "in today's rapidly evolving landscape".

Tagline (updated): **"See it. Fix it."** / "Find what hackers will find first."

---

## 4. Accuracy Rules (retain)

- Only cite verified, sourced statistics (2 years old max).
- Never overclaim scan speed or modules. Guardrails ~6 core checks, ~20–30s typical.
- Attribution: Guardian is the brand. No external studio credit on the site.

---

## 5. Banned (AI tells to avoid)

- Teal/cyan on navy (AI security cliché)
- Warm beige/cream + brass premium (banned palette family)
- Gradient text on large headlines
- Literal shield-and-check logo
- Three-equal-card feature rows, centered hero with pills
- Inter, Funnel Display as a differentiator
- Emojis as icons
