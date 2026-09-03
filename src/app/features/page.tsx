'use client';

import { useState } from 'react';
import { Shield, Zap, Lock, Globe, Brain, FileText, Target, TrendingUp } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import SignInModal from '@/components/auth/SignInModal';

const FEATURES = [
  {
    icon: Zap,
    title: 'Results in about half a minute',
    desc: 'A full external assessment in under a minute — not hours. Run it, watch it, act on it.',
  },
  {
    icon: Brain,
    title: 'Plain-language AI summary',
    desc: 'Each finding is weighed by severity and explained in normal language, with a prioritized fix list. No security degree required.',
  },
  {
    icon: Lock,
    title: 'For sites you own',
    desc: 'Sign in to verify you own the site before scanning. We only run scans where you have the right to test.',
  },
  {
    icon: Shield,
    title: 'Email security you can act on',
    desc: 'DMARC, SPF, and DKIM checks in every scan. See if your domain can be spoofed — and exactly how to lock it down.',
  },
  {
    icon: FileText,
    title: 'Compliance posture',
    desc: 'Checks mapped to Zimbabwe\'s data protection law, POPIA, and other African frameworks, with a clear score and what to fix.',
  },
  {
    icon: Globe,
    title: 'Security headers & SSL',
    desc: 'CSP, HSTS, clickjacking protection, certificate expiry, and TLS strength — the basics attackers probe first.',
  },
  {
    icon: Target,
    title: 'Exposed files & ports',
    desc: 'Detects open ports, exposed services, and sensitive paths like /.env that attackers look for.',
  },
  {
    icon: TrendingUp,
    title: 'Subdomains at a glance',
    desc: 'Finds hidden subdomains — including forgotten admin or staging environments that widen your attack surface.',
  },
];

export default function FeaturesPage() {
  const [showSignIn, setShowSignIn] = useState(false);
  return (
    <div className="min-h-screen bg-surface">
      <Navbar onSignIn={() => setShowSignIn(true)} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-100/40 via-surface to-surface" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 sm:pt-28 pb-16 text-center">
          <p className="text-xs text-brand-500 uppercase tracking-widest mb-4 font-medium">{'// Capabilities'}</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 font-[family-name:var(--font-display)]">
            Everything you need.<br /><span className="gradient-text">Nothing you don&apos;t.</span>
          </h1>
          <p className="text-lg text-brand-600 max-w-2xl mx-auto leading-relaxed">
            Built for Zimbabwean realities. Every feature designed for the constraints and threats unique to the continent.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-5xl mx-auto px-6 pb-20 sm:pb-28">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 sm:p-6 bg-brand-100/30 border border-brand-200/50 rounded-2xl card-hover group hover:border-brand-300/80 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center mb-3 group-hover:bg-brand-500/20 transition-colors">
                <Icon className="w-5 h-5 text-brand-500" />
              </div>
              <h3 className="font-semibold text-brand-800 mb-1.5">{title}</h3>
              <p className="text-sm text-brand-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — dark band */}
      <section className="dark-section border-t border-brand-900/40">
        <div className="max-w-3xl mx-auto px-6 py-16 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] text-brand-100 mb-4">
            See what&apos;s exposed on your site.
          </h2>
          <p className="text-brand-500 mb-8 max-w-xl mx-auto">
            Sign in and run a scan in about half a minute. Free while we&apos;re in beta.
          </p>
          <button
            onClick={() => setShowSignIn(true)}
            className="px-8 py-3.5 bg-accent-500 hover:bg-accent-600 rounded-xl font-semibold text-white transition-all btn-brand"
          >
            Start a free scan
          </button>
        </div>
      </section>

      <Footer />
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}
