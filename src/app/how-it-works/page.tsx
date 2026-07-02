'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import SignInModal from '@/components/auth/SignInModal';

const STEPS = [
  {
    num: '01',
    title: 'Enter a domain',
    desc: 'Type any Zimbabwean or African domain into the scanner. econet.co.zw, cbz.co.zw, stewardbank.co.zw — we handle them all.',
    detail: 'No installation. No agent. No configuration. Supports domains, subdomains, IPs, and full URLs. Passive-only by default — completely safe.',
  },
  {
    num: '02',
    title: 'Automated reconnaissance',
    desc: 'Sentari maps the entire external attack surface in real-time — ports, services, technologies, SSL certificates, exposed APIs, and hidden subdomains.',
    detail: 'Runs 11 specialized scan modules in parallel. DNS enumeration, port scanning, technology fingerprinting, HTTP header analysis, and more.',
  },
  {
    num: '03',
    title: 'AI chains the findings',
    desc: 'Our multi-model AI doesn\'t just list vulnerabilities — it connects them into attack paths, showing exactly how an attacker would chain them to breach the network.',
    detail: 'Multi-model AI analyzes the data through chain-of-thought reasoning, prioritizing by real-world exploitability rather than theoretical severity.',
  },
  {
    num: '04',
    title: 'Get your defense playbook',
    desc: 'A visual risk dashboard with prioritized vulnerabilities, attack path visualization, and step-by-step remediation. Export as PDF. One-click retest.',
    detail: 'Every finding comes with a concrete fix. No jargon. Specific actions your team can take today.',
  },
];

export default function HowItWorksPage() {
  const [showSignIn, setShowSignIn] = useState(false);
  return (
    <div className="min-h-screen bg-surface">
      <Navbar onSignIn={() => setShowSignIn(true)} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-100/40 via-surface to-surface" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 sm:pt-28 pb-16 text-center">
          <p className="text-xs text-brand-500 uppercase tracking-widest mb-4 font-medium">// The Process</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 font-[family-name:var(--font-display)]">
            From domain to defense<br />in <span className="gradient-text">60 seconds.</span>
          </h1>
          <p className="text-lg text-brand-600 max-w-2xl mx-auto leading-relaxed">
            Four steps. Zero installation. One clear outcome: you know exactly where you&apos;re exposed.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-4xl mx-auto px-6 pb-20 sm:pb-28">
        <div className="space-y-0">
          {STEPS.map(({ num, title, desc, detail }, idx) => (
            <div key={num} className="relative group">
              {idx < STEPS.length - 1 && (
                <div className="absolute left-8 top-16 bottom-0 w-px bg-brand-200 hidden md:block" />
              )}
              <div className="flex gap-6 items-start py-8">
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-lg shadow-brand-500/10">
                  <span className="text-white font-bold font-[family-name:var(--font-display)] text-xl">{num}</span>
                </div>
                <div className="flex-1 pb-2">
                  <h3 className="text-xl sm:text-2xl font-semibold text-brand-800 mb-2 font-[family-name:var(--font-display)]">{title}</h3>
                  <p className="text-brand-600 leading-relaxed mb-2">{desc}</p>
                  <p className="text-sm text-brand-500 leading-relaxed">{detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-3 p-4 bg-brand-100 rounded-xl border border-brand-200/50">
          <Zap className="w-5 h-5 text-brand-500" />
          <span className="text-sm text-brand-700"><strong className="text-brand-800">Average scan time:</strong> 47 seconds from domain input to full report</span>
        </div>

        {/* Example scan */}
        <div className="mt-12 bg-brand-100/50 rounded-2xl border border-brand-200/50 p-6 sm:p-8">
          <p className="text-xs text-brand-500 uppercase tracking-widest mb-4 font-medium">Example scan</p>
          <div className="bg-brand-800 rounded-xl p-4 sm:p-6 font-mono text-sm text-brand-200 overflow-x-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-brand-500">$</span>
              <span className="text-brand-300">sentari scan econet.co.zw</span>
            </div>
            <div className="space-y-1.5 text-brand-400">
              <p><span className="text-emerald-400">✓</span> Phase 1: Recon (11 modules) — 18s</p>
              <p><span className="text-emerald-400">✓</span> Phase 2: OSINT enrichment — 12s</p>
              <p><span className="text-emerald-400">✓</span> Phase 3: AI analysis — 15s</p>
              <p><span className="text-emerald-400">✓</span> Phase 4: Report generated — 2s</p>
              <p className="mt-3 text-brand-300"><span className="text-amber-400">!</span> Risk Score: <span className="text-amber-400 font-bold">47/100</span> — 3 critical, 5 high, 8 medium</p>
              <p className="text-brand-300"><span className="text-amber-400">!</span> Attack Path: EcoCash API → exposed admin panel → database</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}
