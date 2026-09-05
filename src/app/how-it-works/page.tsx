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
    desc: 'Type any domain you own or have permission to test — for example, yourcompany.co.zw. Sign in and we handle the rest.',
    detail: 'No installation. No agent. No configuration. Supports domains, subdomains, IPs, and full URLs. Passive-only by default — completely safe.',
  },
  {
    num: '02',
    title: 'Automated reconnaissance',
    desc: 'Guardian maps your external attack surface — security headers, SSL, email authentication, exposed files, open ports, and subdomains.',
    detail: 'Our checks run in parallel and read only what a normal browser request exposes. No agents to install, nothing extra to configure.',
  },
  {
    num: '03',
    title: 'We explain what it means',
    desc: 'Guardian weighs each finding by severity and explains, in plain language, why it matters and what to do about it.',
    detail: 'An AI summary turns the raw checks into a prioritized fix list — no security team required to understand it.',
  },
  {
    num: '04',
    title: 'Get your fix list',
    desc: 'A clear report with your risk score and prioritized findings. Every issue comes with a plain-language fix you can act on.',
    detail: 'No jargon. Specific actions — like adding a security header or locking down an exposed file.',
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
          <p className="text-xs text-brand-500 uppercase tracking-widest mb-4 font-medium">{'// The Process'}</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 font-[family-name:var(--font-display)]">
            From domain to defense<br />in <span className="gradient-text">about half a minute.</span>
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
          <span className="text-sm text-brand-700"><strong className="text-brand-800">Typical scan:</strong> under a minute from domain input to full report</span>
        </div>

        {/* Example scan — dark band */}
        <div className="dark-section mt-12 rounded-3xl border border-brand-900/40 p-6 sm:p-8">
          <p className="text-xs text-brand-400 uppercase tracking-widest mb-4 font-medium">What a scan report tells you</p>
          <div className="bg-surface/60 rounded-xl p-4 sm:p-6 font-mono text-sm text-brand-200 overflow-x-auto border border-brand-900/40">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-brand-400">guardian</span>
              <span className="text-brand-100">scan yoursite.co.zw</span>
            </div>
            <div className="space-y-1.5 text-brand-400">
              <p><span className="text-emerald-400">✓</span> Security headers (CSP, HSTS, X-Frame-Options)</p>
              <p><span className="text-emerald-400">✓</span> SSL certificate & TLS configuration</p>
              <p><span className="text-emerald-400">✓</span> Email: DMARC, SPF, DKIM + spoofing risk</p>
              <p><span className="text-emerald-400">✓</span> Exposed files & sensitive paths</p>
              <p><span className="text-emerald-400">✓</span> Open ports & hidden subdomains</p>
              <p className="mt-3 text-brand-200"><span className="text-amber-400">!</span> Risk score + plain-language fix list for each finding</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}
