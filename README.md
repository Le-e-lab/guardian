# SENTARI

**Africa-First AI-Native Offensive Cyber Validation Platform**

> Built for Africa, by Africa. Detect, validate, and mitigate region-specific cyber threats without relying on high-cost, foreign cloud-dependent security infrastructure.

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
│  │              SCANNING ENGINE (Python)                 │  │
│  │  DNS → Subdomains → Ports → Tech → SSL → Headers     │  │
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
| AI | Groq Cloud (Llama 3.1 8B) | Free (30K tok/min) |
| Scanning | Open-source tools | Free |

**Total Monthly Cost: $0** (free tier limits apply)

## 📊 Features

### MVP (Current)
- ✅ Domain input & scan trigger
- ✅ Passive recon engine (DNS, ports, tech, SSL, headers, subdomains)
- ✅ AI-powered threat analysis
- ✅ Risk scoring (0-100)
- ✅ Vulnerability display with severity
- ✅ Remediation recommendations
- ✅ Real-time scan progress

### Coming Soon
- 📋 PDF report generation
- 🔍 Leaked credential check
- 📱 Social media footprint
- 📈 Scan history & trends
- 🔔 Email alerts
- 🏢 Multi-tenant organization support
- 🔐 Active validation mode (with authorization)

## 🎯 Target Customers

| Segment | Price | Features |
|---------|-------|----------|
| Free | $0/mo | 3 scans, basic recon |
| Starter | $49/mo | 15 scans, full analysis |
| Professional | $149/mo | 50 scans, API access |
| Enterprise | $499/mo | Unlimited, compliance reports |

## 🌍 African Focus

Sentari is specifically designed for Africa's unique cybersecurity landscape:

- **Mobile Money Security**: M-Pesa, EcoCash, Flutterwave attack patterns
- **USSD Vulnerabilities**: Session hijacking, SIM-swap fraud detection
- **Data Sovereignty**: POPIA, NDPA, Kenya DPA compliance
- **Local Pricing**: Affordable for African SMEs
- **Regional Intelligence**: Trained on African threat patterns

## 📝 License

Proprietary - All rights reserved.

## 🤝 Contributing

This is a private repository. For access, contact the development team.

---

**Built with ❤️ for Africa's digital future**
