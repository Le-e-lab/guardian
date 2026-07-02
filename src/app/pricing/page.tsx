'use client';

import { useState } from 'react';
import { CheckCircle, ArrowUpRight } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import SignInModal from '@/components/auth/SignInModal';

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: '/forever',
    desc: 'See your risk score. Know you have problems.',
    features: ['3 scans per day', 'Risk score & severity breakdown', 'Top 3 findings preview', 'No remediation steps', 'No AI analysis', 'No report export'],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '$49',
    period: '/mo',
    desc: 'The full picture. Fix what matters.',
    features: ['15 scans per day', 'Full recon + OSINT', 'AI threat analysis', 'Remediation steps for every finding', 'PDF report export', 'EcoCash payment'],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Professional',
    price: '$149',
    period: '/mo',
    desc: 'Deeper intelligence, team access.',
    features: ['50 scans per day', 'Everything in Starter', 'Attack path visualization', 'Credential leak check', 'Social media OSINT', 'REST API access'],
    cta: 'Go Professional',
    highlighted: false,
  },
  {
    name: 'Enterprise',
    price: '$499',
    period: '/mo',
    desc: 'Active testing & compliance.',
    features: ['Unlimited scans', 'Everything in Professional', 'Active vulnerability testing', 'Continuous monitoring', 'Compliance templates (POPIA, NDPA)', 'Dedicated support & SLA'],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const COMPARISONS = [
  { company: 'Pentera', origin: 'Israel', price: '$35K+/yr', what: 'Enterprise pentesting platform', gap: 'No Africa presence, no local fraud patterns' },
  { company: 'XBOW', origin: 'USA', price: '$6K+/test', what: 'Autonomous offensive security', gap: 'Per-test model, no continuous monitoring' },
  { company: 'Cybervergent', origin: 'Nigeria', price: 'Custom', what: 'AI compliance & posture', gap: 'Governance layer, doesn\'t test exploitability' },
  { company: 'Sendmarc', origin: 'S. Africa', price: 'SaaS', what: 'DMARC/email security', gap: 'Detection only, no offensive validation' },
];

export default function PricingPage() {
  const [showSignIn, setShowSignIn] = useState(false);
  return (
    <div className="min-h-screen bg-surface">
      <Navbar onSignIn={() => setShowSignIn(true)} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-100/40 via-surface to-surface" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 sm:pt-28 pb-16 text-center">
          <p className="text-xs text-brand-500 uppercase tracking-widest mb-4 font-medium">// Pricing</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 font-[family-name:var(--font-display)]">
            Built for Zimbabwe.<br /><span className="gradient-text">Priced for Africa.</span>
          </h1>
          <p className="text-lg text-brand-600 max-w-2xl mx-auto leading-relaxed">
            Enterprise security at a fraction of global prices. Pay with EcoCash. Scale when you&apos;re ready.
          </p>
        </div>
      </section>

      {/* Competitor Comparison Pills */}
      <section className="max-w-4xl mx-auto px-6 mb-12">
        <p className="text-center text-xs text-brand-500 uppercase tracking-widest mb-4 font-medium">How we compare</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { label: 'Pentera', price: '$35K+/yr', active: false },
            { label: 'XBOW', price: '$6K+/test', active: false },
            { label: 'Cybervergent', price: 'Custom', active: false },
            { label: 'Sentari', price: '$49/mo', active: true },
          ].map(({ label, price, active }) => (
            <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition-all ${
              active ? 'bg-brand-500 text-white border-brand-500 font-semibold shadow-lg shadow-brand-500/20' : 'bg-brand-100/50 text-brand-600 border-brand-200/50'
            }`}>
              <span>{label}</span>
              <span className={`font-bold ${active ? '' : 'text-brand-800'}`}>{price}</span>
              {active && <ArrowUpRight className="w-4 h-4" />}
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map(({ name, price, period, desc, features, cta, highlighted }) => (
            <div key={name} className={`rounded-2xl p-6 border transition-all card-hover ${
              highlighted ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20 scale-[1.02]' : 'bg-brand-100/50 border-brand-200/50 hover:border-brand-300'
            }`}>
              <h3 className={`font-semibold mb-1 ${highlighted ? 'text-white' : 'text-brand-800'}`}>{name}</h3>
              <p className={`text-xs mb-4 ${highlighted ? 'text-brand-200' : 'text-brand-600'}`}>{desc}</p>
              <div className="mb-5">
                <span className={`text-4xl font-bold font-[family-name:var(--font-display)] ${highlighted ? 'text-white' : 'text-brand-500'}`}>{price}</span>
                <span className={`text-sm ${highlighted ? 'text-brand-200' : 'text-brand-600'}`}>{period}</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${highlighted ? 'text-brand-200' : 'text-brand-500'}`} />
                    <span className={highlighted ? 'text-brand-100' : 'text-brand-700'}>{f}</span>
                  </li>
                ))}
              </ul>
              <button className={`w-full py-3 rounded-full font-semibold text-sm transition-all ${
                highlighted ? 'bg-white text-brand-500 hover:bg-brand-50' : 'bg-brand-500 text-white hover:bg-brand-600'
              } btn-brand`}>
                {cta}
              </button>
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="mt-8 text-center">
          <p className="text-sm text-brand-500">
            <strong className="text-brand-600">Pay with:</strong> EcoCash · OneMoney · InnBucks · Visa/Mastercard · Bank Transfer
          </p>
        </div>
      </section>

      {/* Detailed Comparison Table */}
      <section className="max-w-5xl mx-auto px-6 pb-20 sm:pb-28">
        <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] text-center mb-8">Competitor Landscape</h2>
        <div className="bg-brand-100/50 border border-brand-200/50 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-200/50">
                  <th className="text-left px-5 py-4 font-semibold text-brand-800">Company</th>
                  <th className="text-left px-5 py-4 font-semibold text-brand-800">Origin</th>
                  <th className="text-left px-5 py-4 font-semibold text-brand-800">Product</th>
                  <th className="text-left px-5 py-4 font-semibold text-brand-800">Pricing</th>
                  <th className="text-left px-5 py-4 font-semibold text-brand-800 hidden sm:table-cell">Gap vs Sentari</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISONS.map(({ company, origin, price, what, gap }) => (
                  <tr key={company} className="border-b border-brand-200/30 last:border-0">
                    <td className="px-5 py-3.5 font-medium text-brand-800">{company}</td>
                    <td className="px-5 py-3.5 text-brand-600">{origin}</td>
                    <td className="px-5 py-3.5 text-brand-600">{what}</td>
                    <td className="px-5 py-3.5 text-brand-600 font-medium">{price}</td>
                    <td className="px-5 py-3.5 text-brand-500 hidden sm:table-cell">{gap}</td>
                  </tr>
                ))}
                <tr className="bg-brand-500/5">
                  <td className="px-5 py-3.5 font-semibold text-brand-800">Sentari</td>
                  <td className="px-5 py-3.5 text-brand-600">Zimbabwe</td>
                  <td className="px-5 py-3.5 text-brand-600">AI-native offensive validation</td>
                  <td className="px-5 py-3.5 text-brand-500 font-bold">$49/mo</td>
                  <td className="px-5 py-3.5 text-brand-600 hidden sm:table-cell">Only platform that is both AI-native/offensive AND Africa-local/sovereign</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Footer />
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}
