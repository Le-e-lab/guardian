'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Shield, ArrowRight, Zap, Lock, CheckCircle, Globe, MapPin
} from 'lucide-react';
import GuardianMark from '@/components/brand/GuardianMark';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import SignInModal from '@/components/auth/SignInModal';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [showSignIn, setShowSignIn] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab]);

  useEffect(() => {
    // Immediately reveal all elements with staggered delays
    const allReveal = document.querySelectorAll('.reveal');
    allReveal.forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = `${i * 120}ms`;
      el.classList.add('visible');
    });

    // Also observe for any new elements (tab switches, etc.)
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    allReveal.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleCTA = () => window.location.href = '/scan';

  return (
    <div className="min-h-screen bg-surface">
      <Navbar onSignIn={() => setShowSignIn(true)} />

      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-100/60 via-surface to-surface" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-brand-200/30 rounded-full blur-[120px]" />
        <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-brand-300/20 rounded-full blur-[80px] animate-float" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 sm:pt-24 pb-16 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-100 border border-brand-200 text-brand-600 text-xs font-medium mb-8 animate-fade-in-up">
            <MapPin className="w-3.5 h-3.5" /> Built in Harare. Built for Zimbabwe.
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] mb-6 font-[family-name:var(--font-display)] animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            Cybersecurity compliance<br /><span className="gradient-text">for Zimbabwean businesses.</span>
          </h1>
          <p className="text-lg sm:text-xl text-brand-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            Guardian scans your site the way an attacker would — then tells you, in plain language, what&apos;s exposed and how to fix it. Built around Zimbabwe&apos;s data protection law.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <button onClick={handleCTA} className="px-8 py-4 bg-accent-500 hover:bg-accent-600 rounded-full font-semibold text-white transition-all inline-flex items-center gap-2 shadow-lg shadow-accent-500/25 btn-brand">
              Scan my website free <ArrowRight className="w-5 h-5" />
            </button>
            <a href="/pricing" className="px-8 py-4 bg-transparent border-2 border-brand-200 hover:border-brand-400 rounded-full font-semibold text-brand-700 transition-all inline-flex items-center gap-2">
              View Pricing
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mt-12 text-sm text-brand-600 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-brand-500" /> Free compliance check</span>
            <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-brand-500" /> Data sovereign</span>
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-brand-500" /> Audit-ready reports</span>
          </div>
        </div>
      </section>

      {/* ==================== STATS BAR (dark band) ==================== */}
      <section className="dark-section border-y border-brand-900/40">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {[
            { value: '~30s', label: 'Until your first report', icon: Zap },
            { value: '6', label: 'Security checks per scan', icon: Globe },
            { value: 'A-F', label: 'Clear risk grade', icon: Shield },
            { value: '$0', label: 'For the first scan', icon: CheckCircle },
          ].map(({ value, label, icon: Icon }) => (
            <div key={label} className="text-center group">
              <Icon className="w-5 h-5 text-brand-400 mx-auto mb-2 group-hover:text-brand-300 transition-colors" />
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-300 font-[family-name:var(--font-display)]">{value}</div>
              <div className="text-xs sm:text-sm text-brand-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== TABS / PROBLEM ==================== */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20 sm:py-24">
        <div className="text-center mb-10 reveal">
          <p className="text-xs text-brand-500 uppercase tracking-widest mb-3 font-medium">Why we exist</p>
          <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)]">Zimbabwe digitizing fast, security lagging</h2>
        </div>

        <div className="flex justify-center mb-10 reveal">
          <div className="relative inline-flex bg-brand-100 rounded-full p-1">
            <div className="absolute top-1 bottom-1 bg-brand-500 rounded-full transition-all duration-300 ease-out"
              style={{ left: indicatorStyle.left, width: indicatorStyle.width }} />
            {['Zimbabwe First', 'Africa Compliance'].map((label, i) => (
              <button key={label} ref={(el) => { tabRefs.current[i] = el; }} onClick={() => setActiveTab(i)}
                className={`relative z-10 px-6 py-2.5 rounded-full text-sm font-medium transition-colors duration-300 ${activeTab === i ? 'text-white' : 'text-brand-600 hover:text-brand-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="animate-fade-in" key={activeTab}>
          {activeTab === 0 ? <ZimbabweTab /> : <AfricaTab />}
        </div>
      </section>

      {/* ==================== QUOTE (dark band) ==================== */}
      <section className="dark-section py-16 sm:py-20 border-y border-brand-900/40">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-accent-500/15 flex items-center justify-center mx-auto mb-6 text-accent-500">
            <GuardianMark className="w-6 h-6" />
          </div>
          <blockquote className="text-xl sm:text-2xl font-[family-name:var(--font-display)] text-brand-100 leading-relaxed mb-6">
            &ldquo;Most local businesses aren&apos;t getting hacked because their stacks are fancy — they&apos;re getting hacked because nobody told them what was exposed. We tell them first.&rdquo;
          </blockquote>
          <p className="text-brand-500 text-sm font-medium uppercase tracking-widest">Why Guardian exists</p>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="py-20 sm:py-24">
        <div className="max-w-4xl mx-auto px-6 text-center reveal">
          <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] mb-6">Wondering what&apos;s actually exposed on your site?</h2>
          <p className="text-brand-600 text-lg mb-8 max-w-2xl mx-auto">Sign in free, then run a scan. You&apos;ll get a plain-language report of your biggest security gaps in about half a minute.</p>
          <button onClick={handleCTA} className="px-8 py-4 bg-accent-500 hover:bg-accent-600 rounded-full font-semibold text-white transition-all inline-flex items-center gap-2 shadow-lg shadow-accent-500/25 btn-brand text-lg">
            Scan my website free <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ==================== WAITLIST ==================== */}
      <WaitlistSection />

      <Footer />
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}

/* =====================================================================
   ZIMBABWE TAB — Home market first
   ===================================================================== */

function ZimbabweTab() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid md:grid-cols-5 gap-10 sm:gap-12 items-start">
        <div className="md:col-span-3">
          <p className="text-xs text-brand-500 uppercase tracking-widest mb-3 font-medium">{'// Zimbabwe Cybersecurity'}</p>
          <h3 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] mb-6 leading-tight">
            Zimbabwe&apos;s digital economy<br />deserves proper protection.
          </h3>
          <div className="space-y-4 text-brand-600 leading-relaxed text-sm sm:text-base">
            <p>
              <strong className="text-brand-800">Zimbabwe&apos;s digital economy is growing fast.</strong> EcoCash, CBZ, Steward Bank, and NetOne are digitizing at speed. The Zimbabwe Stock Exchange is going electronic.
            </p>
            <p>
              But <strong className="text-brand-800">most Zimbabwean firms lack basic cybersecurity</strong>. The tools to protect these systems cost $35,000-$250,000 per year — more than most companies&apos; entire IT budgets.
            </p>
            <p>
              <strong className="text-brand-800">Guardian changes the equation.</strong> Built in Harare, we get you a clear picture of your exposure in minutes — without a security team or a six-figure budget to run it.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-4 p-5 bg-brand-100 rounded-xl border border-brand-200/50">
            <div className="w-12 h-12 rounded-xl bg-accent-500/15 flex items-center justify-center flex-shrink-0 text-accent-500">
              <GuardianMark className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-800">What we believe</p>
              <p className="text-sm text-brand-600">A Bulawayo manufacturer and a Harare fintech face the same risk — and deserve the same clear, honest answers about it.</p>
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="bg-brand-100 rounded-2xl p-6 border border-brand-200">
            <p className="text-xs text-brand-500 uppercase tracking-widest mb-4 font-medium">What each scan checks</p>
            <ul className="space-y-3 text-sm text-brand-700">
              {[
                { label: 'Security headers', detail: 'CSP, HSTS, clickjacking protection' },
                { label: 'SSL/TLS & certificates', detail: 'Expiry, protocol strength, wildcards' },
                { label: 'Email & DMARC/SPF/DKIM', detail: 'Can your domain be spoofed?' },
                { label: 'Exposed files', detail: '/.env, /admin, /wp-config & more' },
                { label: 'Open ports & subdomains', detail: 'What&apos;s reachable from outside' },
              ].map(({ label, detail }) => (
                <li key={label} className="flex items-start gap-3 pb-3 border-b border-brand-200/50 last:border-0 last:pb-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-brand-800">{label}</p>
                    <p className="text-xs text-brand-600">{detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   WHY AFRICA TAB — Compliance across the continent
   ===================================================================== */

function AfricaTab() {
  const regulations = [
    {
      icon: Shield,
      title: 'POPIA (South Africa)',
      desc: 'Protection of Personal Information Act — comprehensive data protection with strict enforcement. Fines up to R10M, 72-hour breach notification, mandatory Information Officer.',
      country: 'South Africa',
      highlight: true,
    },
    {
      icon: Shield,
      title: 'NDPA (Nigeria)',
      desc: 'Nigeria Data Protection Act — modeled after GDPR, enforced by NDPC. Applies to all organizations processing Nigerian residents\' data. Compliance audits mandatory.',
      country: 'Nigeria',
      highlight: true,
    },
    {
      icon: Shield,
      title: 'Kenya DPA',
      desc: 'Kenya Data Protection Act — comprehensive data protection law. Requires registration with ODPC, data protection impact assessments, and 72-hour breach notification.',
      country: 'Kenya',
      highlight: false,
    },
    {
      icon: Shield,
      title: 'GDPR (Global)',
      desc: 'General Data Protection Regulation — EU standard applicable to any organization processing EU data subjects\' data. The gold standard for data protection.',
      country: 'Global',
      highlight: false,
    },
  ];

  const competitors = [
    { name: 'Cybervergent', country: 'Nigeria', focus: 'AI compliance & posture', gap: 'Governance layer — doesn\'t validate technical controls' },
    { name: 'Sendmarc', country: 'S. Africa', focus: 'DMARC & email security', gap: 'Email only — no comprehensive compliance' },
    { name: 'Entersekt', country: 'S. Africa', focus: 'Mobile banking auth', gap: 'Fraud channel — not data protection compliance' },
    { name: 'Youverify', country: 'Nigeria', focus: 'KYC & identity', gap: 'Identity layer — not infrastructure compliance' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <p className="text-xs text-brand-500 uppercase tracking-widest mb-3 font-medium">{'// Compliance Across Africa'}</p>
        <h3 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] mb-4">
          One platform. Every African data protection law.
        </h3>
        <p className="text-brand-600 text-base sm:text-lg max-w-2xl mx-auto">
          From POPIA to NDPA to Kenya DPA — Guardian automates compliance across the continent. No other platform understands African data protection like we do.
        </p>
      </div>

      {/* Regulation Cards */}
      <div className="grid sm:grid-cols-2 gap-5 mb-10">
        {regulations.map(({ icon: Icon, title, desc, country, highlight }) => (
          <div key={title} className={`rounded-2xl p-5 sm:p-6 border card-hover group ${
            highlight ? 'bg-brand-100 border-brand-300' : 'bg-brand-100/50 border-brand-200/50'
          }`}>
            <div className="flex items-start gap-4 mb-3">
              <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500/20 transition-colors">
                <Icon className="w-5 h-5 text-brand-500" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-brand-800">{title}</h4>
                <span className="text-xs text-brand-500">{country}</span>
              </div>
            </div>
            <p className="text-sm text-brand-600 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Competitive Landscape */}
      <div className="bg-brand-100/50 rounded-2xl border border-brand-200/50 p-6">
        <p className="text-xs text-brand-500 uppercase tracking-widest mb-4 font-medium">Adjacent players in Africa</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {competitors.map(({ name, country, focus, gap }) => (
            <div key={name} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-brand-800">{name} <span className="font-normal text-brand-500">({country})</span></p>
                <p className="text-xs text-brand-600">{focus} — <span className="text-brand-500">{gap}</span></p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-brand-200/50">
          <p className="text-sm text-brand-700">
            <strong className="text-brand-800">Guardian</strong> is the only platform that combines <strong>automated compliance scanning</strong> with <strong>AI-powered remediation guidance</strong> across all major African data protection laws.
          </p>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   WAITLIST SECTION — Email capture for early demand
   ===================================================================== */

function WaitlistSection() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, company, country: 'Zimbabwe' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage(data.alreadyExists ? data.message : 'You\'re on the list! We\'ll be in touch.');
        setEmail('');
        setName('');
        setCompany('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <section className="dark-section py-16 sm:py-20 border-t border-brand-900/40">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/15 border border-brand-200 text-brand-400 text-xs font-medium mb-6">
          <Lock className="w-3.5 h-3.5" /> Early Access
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] text-brand-100 mb-4">
          Want us to watch over things for you?
        </h2>
        <p className="text-brand-500 mb-8 max-w-lg mx-auto">
          Leave your email and we&apos;ll let you know when monitoring and reports are ready to use.
        </p>

        {status === 'success' ? (
          <div className="bg-brand-500/15 border border-brand-200 rounded-2xl p-6 text-brand-100">
            <CheckCircle className="w-8 h-8 mx-auto mb-3 text-brand-400" />
            <p className="font-semibold">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-brand-200 text-brand-100 placeholder:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
            <input
              type="text"
              placeholder="Company (optional)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-brand-200 text-brand-100 placeholder:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-4 py-3 rounded-xl bg-surface border border-brand-200 text-brand-100 placeholder:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="px-6 py-3 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all text-sm whitespace-nowrap btn-brand"
              >
                {status === 'submitting' ? 'Joining...' : 'Join Waitlist'}
              </button>
            </div>
            {status === 'error' && (
              <p className="text-red-400 text-sm">{message}</p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
