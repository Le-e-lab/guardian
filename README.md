# SENTARI

**Africa-First AI-Native Offensive Cyber Validation Platform**

> Built for Africa, by Africa. AI-native offensive cyber validation that detects, validates, and mitigates region-specific cyber threats — EcoCash fraud, USSD hijacking, SIM swaps, BEC — without the $35K+/yr price tag of Western tools.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (free tier)
- Groq API key (free tier)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Le-e-lab/sentari.git
   cd sentari
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
│                    SENTARI MVP ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ FRONTEND │◄──►│  API LAYER   │◄──►│   AI REASONING   │  │
│  │ React/   │    │  Next.js     │    │   Groq Cloud API │  │
│  │ Next.js  │    │  API Routes  │    │   (Llama 3.1 8B) │  │
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
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | Next.js 14, Tailwind CSS | Free (Vercel) |
| Database | Supabase (PostgreSQL) | Free (500MB) |
| Auth | Supabase Auth | Free (50K MAU) |
| AI | Multi-model: Groq, OpenRouter, HuggingFace, Ollama | Free / Low-cost |
| Scanning | Open-source tools | Free |

**Total Monthly Cost: $0** (free tier limits apply)

## 📊 Features

### Completed
- ✅ Domain input & scan trigger
- ✅ 11 parallel scan modules (DNS, ports, tech, SSL, headers, subdomains, credentials, social OSINT, threat intel, African threats, forum monitoring)
- ✅ Multi-provider AI attack path reasoning
- ✅ Risk scoring (0-100)
- ✅ Vulnerability display with severity
- ✅ Remediation recommendations
- ✅ Real-time scan progress
- ✅ PDF report generation
- ✅ Credential leak detection (XposedOrNot)
- ✅ Social media OSINT (8 platforms)
- ✅ African threat intelligence
- ✅ Scan history & trends
- ✅ Email alerts
- ✅ Multi-user organization support
- ✅ Compliance templates (POPIA, NDPA, Kenya DPA, GDPR, ISO 27001)
- ✅ Auth (Supabase magic link)
- ✅ Active validation mode (with authorization token)

### Roadmap
- 🔄 Continuous monitoring (Enterprise tier)
- 🔄 Custom scan profiles
- 🔄 REST API for MSSP integration
- 🔄 White-label support

## 🎯 Target Customers

| Segment | Price | Features |
|---------|-------|----------|
| Free | $0/mo | 10 scans/day, basic recon |
| Starter | $49/mo | 15 scans, full analysis |
| Professional | $149/mo | 50 scans, API access |
| Enterprise | $499/mo | Unlimited, compliance reports |

## 🌍 African Focus

Sentari is specifically designed for Africa's unique cybersecurity landscape:

- **Mobile Money Security**: EcoCash, M-Pesa, Airtel Money attack patterns
- **USSD Vulnerabilities**: Session hijacking, SIM-swap fraud detection
- **BEC & Invoice Fraud**: Business Email Compromise targeting African companies
- **Data Sovereignty**: Zimbabwe Data Protection Act, POPIA, NDPA, Kenya DPA compliance
- **Local Pricing**: $49/mo vs $35K+/yr for Western tools
- **Regional Intelligence**: 11 scan modules trained on African threat patterns

## 📝 License

Proprietary - All rights reserved.

## 🤝 Contributing

This is a private repository. For access, contact the development team.

---

**Built with ❤️ for Africa's digital future**
