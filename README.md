# GUARDIAN (formerly SENTARI)

**Africa-First AI-Native Cyber Defense Platform**

> Built for Africa, by Africa. AI-native offensive cyber validation that detects, validates, and mitigates region-specific cyber threats — EcoCash fraud, USSD hijacking, SIM swaps, BEC — without the $35K+/yr price tag of Western tools.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm
- Supabase account (free tier)
- Groq API key (free tier)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Le-e-lab/guardian.git
   cd guardian
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in your credentials:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
   - `GROQ_API_KEY` - Groq API key for AI analysis

4. **Set up database**
   - Go to Supabase SQL Editor
   - Run the contents of `supabase/schema.sql`

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open**
   - Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GUARDIAN MVP ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ FRONTEND │◄──►│  API LAYER   │◄──►│   AI REASONING   │  │
│  │ React/   │    │  Next.js     │    │   Groq + Fusion  │  │
│  │ Next.js  │    │  API Routes  │    │   (multi-model)  │  │
│  │ (Vercel) │    │              │    │                  │  │
│  └──────────┘    └──────┬───────┘    └──────────────────┘  │
│                         │                                    │
│                    ┌────▼────┐                               │
│                    │SUPABASE │                               │
│                    │ DB +    │                               │
│                    │ Auth +  │                               │
│                    │ Storage │                               │
│                    └─────────┘                               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              SCANNING ENGINE (Node.js)                 │  │
│  │  DNS → Subdomains → Ports → Tech → SSL → Headers     │  │
│  │  → Credentials → OSINT → Threat Intel → African Intel │  │
│  │  → Email Security → VirusTotal → Compliance           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Auth | Supabase Auth (magic link + OAuth) |
| AI | Multi-model fusion: Groq, OpenRouter, HuggingFace, Ollama |
| Scanning | Passive OSINT modules + active scanning (enterprise, authorization-gated) |

## 📊 Features

### Completed
- ✅ Domain input & scan trigger (authorized-testing only)
- ✅ 11+ parallel scan modules (DNS, ports, tech, SSL, headers, subdomains, credentials, social OSINT, threat intel, African threats, forum monitoring)
- ✅ Email security suite (SPF, DMARC, DKIM, BIMI, MTA-STS, spoofing risk calculator)
- ✅ VirusTotal domain reputation + port scanning
- ✅ Multi-provider AI attack path reasoning
- ✅ Risk scoring (0-100)
- ✅ Vulnerability display with severity
- ✅ Remediation recommendations
- ✅ Real-time scan progress
- ✅ PDF report generation (paid tiers)
- ✅ Credential leak detection (XposedOrNot)
- ✅ Social media OSINT (8 platforms)
- ✅ African threat intelligence
- ✅ Scan history & trends
- ✅ Compliance templates (POPIA, NDPA, Kenya DPA, GDPR, ISO 27001)
- ✅ Auth (Supabase) + role-based access + tier gating
- ✅ Active validation mode (enterprise, triple-gated: global flag → domain ownership → role)
- ✅ Feedback + waitlist channels

### Roadmap
- 🔄 Continuous monitoring (Enterprise tier)
- 🔄 Custom scan profiles
- 🔄 REST API for MSSP integration
- 🔄 White-label support
- 🔄 Payment integration (EcoCash/Stripe)

## 🎯 Beta Status

The product is **in beta** — all features unlocked for free while we collect feedback. Pricing tiers (Starter/Professional/Enterprise) are announced as TBA on the pricing page and will be set after beta.

| Plan | Status | Notes |
|------|--------|-------|
| Free | Live | 3 scans/month during beta (config: verify quota) |
| Starter | TBA | Post-beta: more scans, full recon, site reports |
| Professional | TBA | Post-beta: credential check, social OSINT, API |
| Enterprise | TBA | Post-beta: authorized active testing, monitoring |

## ⚠️ Authorized-Use Policy

Guardian only scans domains you own or have explicit permission to test. Passive checks run by default; active validation requires verified domain ownership and is gated to Enterprise. Unauthorized scanning is illegal.

## 🌍 African Focus

Guardian is specifically designed for Africa's unique cybersecurity landscape:

- **Mobile Money Security**: EcoCash, M-Pesa, Airtel Money attack patterns
- **USSD Vulnerabilities**: Session hijacking, SIM-swap fraud detection
- **BEC & Invoice Fraud**: Business Email Compromise targeting African companies
- **Data Sovereignty**: Zimbabwe Data Protection Act, POPIA, NDPA, Kenya DPA compliance
- **Local Pricing**: from $5/mo target vs $35K+/yr for Western tools
- **Regional Intelligence**: scan modules trained on African threat patterns

## 📝 License

Proprietary - All rights reserved.

## 🤝 Contributing

This is a private repository. For access, contact the development team.