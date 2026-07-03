'use client';

import { useState } from 'react';
import { Shield, Zap, Lock, Globe, Brain, FileText, Target, TrendingUp } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import SignInModal from '@/components/auth/SignInModal';

const FEATURES = [
  {
    icon: Zap,
    title: 'Sub-60s Scan Time',
    desc: 'Full external threat assessment in under a minute. Not hours. Not days. Real-time results when you need them.',
  },
  {
    icon: Brain,
    title: 'AI Attack Path Reasoning',
    desc: 'Multi-model AI chains individual vulnerabilities into real attack paths — showing how an attacker would breach your network, not just listing CVEs.',
  },
  {
    icon: Lock,
    title: 'No Login Required',
    desc: 'Scan any domain without creating an account. Free during beta. Your results are yours — we don\'t require sign-up to see your full report.',
  },
  {
    icon: Shield,
    title: 'African Threat Intelligence',
    desc: 'EcoCash fraud, SIM swaps, USSD hijacking, BEC patterns — the attack playbook no Western scanner knows. Built with African threat context.',
  },
  {
    icon: FileText,
    title: 'Compliance Reports',
    desc: 'Automated checks against Zimbabwe\'s Data Protection Act, POPIA, Kenya DPA, Nigeria NDPA, GDPR, and ISO 27001. See your compliance score instantly.',
  },
  {
    icon: Globe,
    title: 'Email Security Analysis',
    desc: 'DMARC, SPF, and DKIM checks in every scan. See if your email is configured correctly or if spoofing is possible.',
  },
  {
    icon: Target,
    title: 'Port & Service Scanning',
    desc: 'Detects open ports, exposed services, and misconfigurations that attackers look for. Know exactly what\'s visible to the outside world.',
  },
  {
    icon: TrendingUp,
    title: 'Domain Reputation Check',
    desc: 'VirusTotal integration checks if your domain has been flagged for malware, phishing, or suspicious activity across security vendors.',
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
          <p className="text-xs text-brand-500 uppercase tracking-widest mb-4 font-medium">// Capabilities</p>
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

      <Footer />
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}
