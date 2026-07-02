# Sentari Brand Guidelines

> Version 1.0 — July 2026
> Source of truth for all Sentari brand identity, voice, and messaging.

---

## 1. Brand Identity

### What is Sentari?

Sentari is an **Africa-first AI-native offensive cyber validation platform**. It combines Kali Linux toolset (Nmap, httpx, subfinder, nikto) with multi-provider AI reasoning (Groq/Llama 3.1, OpenRouter, HuggingFace, Ollama) for continuous security validation. Built in Harare, Zimbabwe by Elevate Value Partners.

### Brand Positioning

**Sentari** = the only platform that is both AI-native/offensive AND Africa-local/sovereign.

- **Not** a compliance tool (that's Cybervergent)
- **Not** email security (that's Sendmarc)
- **Not** mobile banking auth (that's Entersekt)
- **Not** identity verification (that's Youverify)
- **Not** a Western pentesting tool with an Africa price tag

Sentari is **offensive security built for African realities** — EcoCash APIs, USSD channels, SIM swap patterns, mobile money fraud, BEC attacks — at $49/month instead of $35K+/year.

### Target Markets (Priority Order)

1. **Zimbabwe** — primary market, launch country
2. **South Africa** — largest African cyber market (42.44% share)
3. **Nigeria** — fastest growing (14.46% CAGR)
4. **Kenya** — mobile money hub
5. **Botswana, Mozambique, Zambia** — expansion

### Customer Segments

| Segment | Example | Tier | Price |
|---------|---------|------|-------|
| SMEs / Startups | Harare fintech, Bulawayo manufacturer | Starter | $49/mo |
| Fintechs / Mid-size | EcoCash-adjacent, mobile money providers | Professional | $149/mo |
| Banks & Telcos | CBZ, Steward Bank, Econet, NetOne | Enterprise | $499/mo |
| MSSPs | Managed security service providers | Enterprise | Custom |
| Government | Zimbabwe ICT ministry, agencies | On-premise | Custom |

---

## 2. Visual Identity

### Color Palette

**Primary Brand Colors (Warm Editorial)**

| Token | Hex | Use |
|-------|-----|-----|
| brand-50 | #FAF7F2 | Lightest tint |
| brand-100 | #F5EFE6 | Card backgrounds, surfaces |
| brand-200 | #EADECD | Borders, subtle dividers |
| brand-300 | #D4C4A8 | Scrollbar, muted accents |
| brand-400 | #BFA882 | Secondary accent |
| brand-500 | #A88C74 | **Primary accent** — CTAs, active states, links |
| brand-600 | #8B7355 | Hover states, secondary text |
| brand-700 | #6B5A42 | Headings on light, strong text |
| brand-800 | #4A3D2E | Primary headings |
| brand-900 | #2A221A | Near-black |

**Surface Colors**

| Token | Hex | Use |
|-------|-----|-----|
| surface | #FDFBF7 | Page background (warm white) |
| surface-alt | #F5EFE6 | Alternate sections |
| surface-raised | #FFFFFF | Elevated cards |

**Dark Theme (Scanner Dashboard)**

| Token | Hex | Use |
|-------|-----|-----|
| dark-bg | #0F0E0C | Dark page background |
| dark-surface | #1A1814 | Dark card surface |
| dark-border | #2A2720 | Dark borders |
| dark-text | #F5EFE6 | Text on dark |

**Severity Colors**

| Level | Hex | Use |
|-------|-----|-----|
| critical | #DC2626 | Critical findings |
| high | #EA580C | High severity |
| medium | #D97706 | Medium severity |
| low | #2563EB | Low severity / info |
| info | #6B7280 | Informational |

### Typography

| Role | Font | Variable |
|------|------|----------|
| **Display / Headings** | Funnel Display | `--font-display` |
| **Body / UI** | IBM Plex Sans | `--font-body` |

**Scale**
- h1: 4xl–7xl (responsive), Funnel Display, bold, leading-[1.1]
- h2: 3xl–4xl, Funnel Display, bold
- h3: 2xl, Funnel Display, bold
- h4: lg, IBM Plex Sans, semibold
- Body: base–lg, IBM Plex Sans, regular, leading-relaxed
- Small / Captions: sm–xs, IBM Plex Sans, medium

### Spacing & Layout

- Max content width: `max-w-5xl` (landing), `max-w-4xl` (focused), `max-w-7xl` (full)
- Section padding: `py-20 sm:py-24`
- Card border radius: `rounded-2xl` (cards), `rounded-xl` (smaller elements), `rounded-full` (pills/badges)
- Card hover: `translateY(-4px)` with `box-shadow: 0 12px 32px rgba(168,140,116,0.12)`

### Brand Effects

- **Paper grain texture**: 2.5% opacity noise overlay on body (SVG data URI)
- **Gradient text**: `linear-gradient(135deg, #A88C74, #6B5A42)` — used for emphasis in headings
- **Scroll reveal**: Elements fade up on intersection (`.reveal` class)
- **Button hover**: `translateY(-1px)` + warm box-shadow
- **Card hover**: `translateY(-4px)` + expanded shadow

---

## 3. Brand Voice

### Voice Profile

**Tone**: Authoritative + accessible + African-market-native.
**Style**: Bloomberg Terminal meets Stripe's blog.

### Voice Principles

1. **Specifics over superlatives** — Numbers, mechanisms, receipts beat adjectives
2. **No fake urgency** — Real threats create real urgency; manufactured FOMO is banned
3. **No fake social proof** — Only cite real stats, real companies, real numbers
4. **African-market-native** — Lead with Zimbabwe, expand to Africa. Reference EcoCash, CBZ, Econet, USSD, mobile money. Don't explain what EcoCash is — the audience knows
5. **Direct and compressed** — Say it in fewer words. Kill throat-clearing
6. **Technical but accessible** — Show the mechanism, explain the impact

### Banned Words & Phrases

- game-changing, revolutionary, cutting-edge, leverage, synergy
- "In today's rapidly evolving landscape"
- "Excited to share"
- "Here's why this matters" (as standalone bridge)
- "Not X, just Y"
- "No fluff"
- Any forced lowercase for aesthetic

### Sentence Style

- Lead with the concrete thing: artifact, number, example, outcome
- Explain after the example, not before
- Use proof instead of adjectives
- Questions are rare — never used as bait
- Parentheticals for qualification, not decoration
- Transitions should feel earned, not smoothed over

### Voice Examples

**Good**: "EcoCash processes over 10 million transactions monthly. The tools to protect these systems cost $35,000-$250,000 per year."
**Bad**: "In today's rapidly evolving digital landscape, cybersecurity has never been more important for African businesses."

**Good**: "Built in Harare. Built for Africa."
**Bad**: "We're excited to announce our revolutionary new platform."

**Good**: "Zimbabwe's businesses deserve to know where they're exposed — before an attacker does."
**Bad**: "Join us on our exciting journey to transform cybersecurity across the continent."

---

## 4. Messaging Framework

### Tagline

**"Find what hackers will find first."**

### Key Messages (by audience)

**For Zimbabwe SMEs:**
- Enterprise security at $49/month — less than your office internet bill
- No installation. No agent. No IT team needed. Just a domain name.
- EcoCash-ready. Data sovereign. Priced in USD.

**For Fintechs & Banks:**
- AI chains individual vulnerabilities into real attack paths
- Shows how an attacker would breach your network, not just lists CVEs
- Compliant with Zimbabwe Data Protection Act, POPIA, Kenya DPA from day one

**For MSSPs:**
- Full REST API for integration into your existing security stack
- Automate scans on a schedule, pull results into your SIEM
- White-label ready

**For Government:**
- On-premise deployment option for data sovereignty
- Sovereign AI — no data leaves the country
- Built by a Zimbabwean company, for Zimbabwean infrastructure

### Value Props (ordered by priority)

1. **Africa-first** — Built for EcoCash, USSD, SIM swaps, mobile money fraud
2. **100x cheaper** — $49/mo vs $35K+/yr for Western tools
3. **AI-native** — Multi-model AI chains findings into attack paths
4. **60 seconds** — Full external threat assessment in under a minute
5. **Data sovereign** — Your data stays in Africa

---

## 5. Logo Usage

### Primary Logo

- **Wordmark**: SENTARI in Funnel Display, bold, tracking-tight
- **Icon**: Shield icon (Lucide `Shield` component) — warm brown (#A88C74) on brand surfaces, white on brand-500 backgrounds
- **Combined**: Icon + wordmark, horizontal layout, 2.5 gap

### Logo Rules

- Always use the Shield icon with SENTARI wordmark
- Minimum clear space: 1x icon width on all sides
- On dark backgrounds: white icon + white wordmark
- On light backgrounds: brand-500 icon + brand-800 wordmark
- Never stretch, rotate, or apply effects to the logo

---

## 6. Content Structure

### Landing Page (`/`)

**Hero**
- Badge: "Built in Harare. Built for Africa." (with MapPin icon)
- Headline: "Find what hackers will find first."
- Subline: One sentence — what it does, who it's for, why it matters
- CTA: "Start Free Scan" (primary) + "See How It Works" (secondary)
- Trust badges: Free tier, Data sovereign, Results in under 60s

**Stats Bar**
- 4 stats, real numbers, each with an icon
- Format: Large number + one-line context

**Tabs (Mission / Why Africa)**
- Section heading: "The problem we're solving" (NOT "Our Story")
- Mission: Why we exist → Zimbabwe digital economy → cost problem → Sentari solution
- Why Africa: Threat landscape → specific attack patterns → competitive landscape

**Designed & Built By**
- Elevate Value Partners attribution with link to website
- Do NOT list unverified client names

**Quote / Mission Statement**
- Shield icon (NOT stars — stars imply fake social proof)
- Mission statement text
- "SENTARI MISSION STATEMENT" label in uppercase tracking

**Final CTA**
- Same message as hero, different phrasing
- "Start Free Scan" button

### Features Page (`/features`)

**Hero**: "Everything you need. Nothing you don't."
**Grid**: 3-column, icon + title + one-paragraph desc
**Order**: Sub-60s → AI Attack Path → Data Sovereignty → African Threat Intel → Reports → Team → API → Monitoring → Compliance

### How It Works (`/how-it-works`)

**Hero**: "From domain to defense in 60 seconds."
**4 Steps**: Numbered timeline, title + description + technical detail
**Example scan**: Terminal-style code block showing realistic output

### Pricing (`/pricing`)

**Hero**: "Built for Zimbabwe. Priced for Africa."
**Comparison pills**: Competitor prices vs Sentari
**4-tier cards**: Free → Starter → Professional → Enterprise
**Payment methods**: EcoCash, OneMoney, InnBucks, Visa/Mastercard, Bank Transfer
**Competitor table**: Side-by-side comparison

---

## 7. Accuracy Rules

### Statistics Policy

- **Only cite verified, sourced statistics**
- If a stat cannot be sourced, use qualitative language ("many", "most") or remove it
- When citing ranges, cite the source
- Update stats quarterly or when new data is available

### Known Verified Stats

| Stat | Value | Source |
|------|-------|--------|
| EcoCash active users | 10M+ | Econet annual reports |
| Mobile money transactions/month (Zimbabwe) | 140M+ | RBZ quarterly reports |
| Western tool pricing | $35K-$250K/yr | Pentera, Horizon3 public pricing |
| XBOW per-test pricing | $4K/test | XBOW public pricing |
| Africa cyber market | $0.76B → $1.42B (13.26% CAGR to 2031) | Industry research |
| SA market share | 42.44% | Industry research |
| Nigeria CAGR | 14.46% (fastest) | Industry research |
| Sentari average scan time | 47 seconds | Internal benchmark |
| 11 scan modules | dns-lookup, port-scan, tech-detect, ssl-check, header-check, subdomain-enum, credential-check, social-osint, threat-intel, african-threat-intel, forum-osint | Product architecture |
| Multi-provider AI | Groq, OpenRouter, HuggingFace, Ollama | Product architecture |

### Stats Requiring Verification

| Stat | Current Value | Status |
|------|--------------|--------|
| Cyber incidents reported Zimbabwe 2024 | 2,847 | Needs source |
| SIM swap attack increase 2024 | 340% | Needs source |
| Mobile fraud loss Africa 2025 | $4.2B | Needs source |
| BEC attack rise across Africa | 65% | Needs source |
| USSD reliance Zimbabwe | 70% | Needs source |
| Companies with proper security Zimbabwe | <12% | Needs source |
| Econet, CBZ, Steward Bank, ZSE, Old Mutual as EVP clients | Listed | Verify with EVP |

---

## 8. Footer & Navigation Structure

### Navbar Links

- Home (`/`)
- How It Works (`/how-it-works`)
- Features (`/features`)
- Pricing (`/pricing`)
- Sign In / Dashboard (auth-dependent)

### Footer Columns

1. **Brand**: Logo + one-liner + "Designed & Built by Elevate Value Partners"
2. **Product**: How It Works, Features, Pricing, Dashboard
3. **Company**: Mission, About EVP, Portfolio, Services
4. **Presence**: Harare, Lagos, Nairobi, Johannesburg (city dots)
5. **Bottom**: Copyright + Privacy, Terms, Security links

### Footer Links to Verify

- `https://www.elevatevaluepartners.co.zw/` — EVP main
- `https://www.elevatevaluepartners.co.zw/about` — EVP about
- `https://www.elevatevaluepartners.co.zw/work` — EVP portfolio
- `https://www.elevatevaluepartners.co.zw/services` — EVP services

---

## 9. SEO Metadata

### Title Tag

`SENTARI — Africa-First AI-Native Cyber Defense`

### Meta Description

`AI-native offensive cyber validation platform built for Africa. Automated vulnerability scanning powered by multiple AI models. Priced for African budgets — from $49/month.`

### Keywords

cybersecurity, Africa, threat intelligence, penetration testing, vulnerability assessment, AI security, Zimbabwe, Nigeria, Kenya, EcoCash security, mobile money security, data sovereignty, POPIA compliance

---

## 10. Brand Dos and Don'ts

### Do

- Lead with Zimbabwe-specific context
- Use real numbers and real company names (verified)
- Reference specific African attack patterns (EcoCash, USSD, SIM swap)
- Show the mechanism, explain the impact
- Compare honestly against competitors
- Credit Elevate Value Partners as the builder

### Don't

- Use fake testimonials or unverified claims
- Reference companies as clients without verification
- Use 5-star ratings on mission statements (implies fake reviews)
- Use Western-centric framing ("game-changing", "disrupting")
- Explain what EcoCash is (the audience knows)
- Overclaim scan speed (actual: 47s average)
- Mix brand identities (EVP warm editorial for landing, dark cyberpunk for scanner)
- Use dead links (Privacy, Terms, Security pages must exist before linking)
