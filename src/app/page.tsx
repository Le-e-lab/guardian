'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Shield, ArrowRight, Zap, Lock, CheckCircle, Target,
  Globe, Brain, AlertTriangle, CreditCard, Smartphone, Radio,
  Fingerprint, Building2, MapPin
} from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import SignInModal from '@/components/auth/SignInModal';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [showSignIn, setShowSignIn] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email || '' } : null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ? { id: s.user.id, email: s.user.email || '' } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

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
            AI-powered compliance scanning for Zimbabwe&apos;s data protection regulations. Automated assessments, audit-ready reports, and remediation guidance — all data sovereign.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <button onClick={handleCTA} className="px-8 py-4 bg-brand-500 hover:bg-brand-600 rounded-full font-semibold text-white transition-all inline-flex items-center gap-2 shadow-lg shadow-brand-500/20 btn-brand">
              Start Free Assessment <ArrowRight className="w-5 h-5" />
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

      {/* ==================== STATS BAR ==================== */}
      <section className="border-y border-brand-200/50 bg-brand-100/30">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {[
            { value: '70%+', label: 'ZW firms lack basic cybersecurity', icon: Building2 },
            { value: '<60s', label: 'Full compliance scan', icon: Zap },
            { value: '$49', label: 'Enterprise security, per month', icon: CreditCard },
            { value: 'R5bn+', label: 'Lost to cybercrime in SA alone', icon: AlertTriangle },
          ].map(({ value, label, icon: Icon }) => (
            <div key={label} className="text-center group">
              <Icon className="w-5 h-5 text-brand-400 mx-auto mb-2 group-hover:text-brand-500 transition-colors" />
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-500 font-[family-name:var(--font-display)]">{value}</div>
              <div className="text-xs sm:text-sm text-brand-600 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== TABS ==================== */}
      <section className="max-w-6xl mx-auto px-6 py-20 sm:py-24">
        <div className="text-center mb-10 reveal">
          <p className="text-xs text-brand-500 uppercase tracking-widest mb-3 font-medium">Why we exist</p>
          <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)]">The problem we&apos;re solving</h2>
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

      {/* ==================== TRUSTED BY ==================== */}
      <section className="bg-brand-100/40 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-6 text-center reveal">
          <p className="text-xs text-brand-500 uppercase tracking-widest mb-6 font-medium">Designed &amp; Built by</p>
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-[family-name:var(--font-display)] text-brand-800">Elevate Value Partners</span>
          </div>
          <p className="text-brand-600 max-w-xl mx-auto mb-6">
            Harare-based software studio building custom web apps, mobile apps, and AI solutions for startups and enterprises across Zimbabwe and Africa.
          </p>
          <a href="https://www.elevatevaluepartners.co.zw/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface rounded-full border border-brand-200/50 text-sm text-brand-600 font-medium hover:border-brand-400 hover:text-brand-700 transition-all">
            Visit elevatevaluepartners.co.zw <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* ==================== QUOTE ==================== */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6 text-center reveal">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-6 h-6 text-brand-500" />
          </div>
          <blockquote className="text-xl sm:text-2xl font-[family-name:var(--font-display)] text-brand-800 leading-relaxed mb-6">
            &ldquo;Zimbabwe&apos;s businesses deserve to know where they stand — before an attacker does. We&apos;re building the shield.&rdquo;
          </blockquote>
          <p className="text-brand-500 text-sm font-medium uppercase tracking-widest">Guardian Mission Statement</p>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="py-20 sm:py-24">
        <div className="max-w-4xl mx-auto px-6 text-center reveal">
          <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] mb-6">Ready to check your cybersecurity posture?</h2>
          <p className="text-brand-600 text-lg mb-8 max-w-2xl mx-auto">Start with a free compliance assessment. See your score in under 60 seconds. Upgrade for full audit-ready reports.</p>
          <button onClick={handleCTA} className="px-8 py-4 bg-brand-500 hover:bg-brand-600 rounded-full font-semibold text-white transition-all inline-flex items-center gap-2 shadow-lg shadow-brand-500/20 btn-brand text-lg">
            Start Free Assessment <ArrowRight className="w-5 h-5" />
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
          <p className="text-xs text-brand-500 uppercase tracking-widest mb-3 font-medium">// Zimbabwe Cybersecurity</p>
          <h3 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] mb-6 leading-tight">
            Zimbabwe&apos;s digital economy<br />deserves proper protection.
          </h3>
          <div className="space-y-4 text-brand-600 leading-relaxed text-sm sm:text-base">
            <p>
              <strong className="text-brand-800">EcoCash processes over 600 million transactions monthly</strong>. CBZ, Steward Bank, and NetOne are digitizing at speed. The Zimbabwe Stock Exchange is going electronic.
            </p>
            <p>
              But <strong className="text-brand-800">70%+ of Zimbabwean firms lack basic cybersecurity</strong>. The tools to protect these systems cost $35,000-$250,000 per year — more than most companies&apos; entire IT budgets.
            </p>
            <p>
              <strong className="text-brand-800">Guardian changes the equation.</strong> Built in Harare by Elevate Value Partners, we deliver enterprise-grade compliance scanning at $49/month — because the cost of not doing it is measured in breached trust, stolen funds, and collapsed businesses.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-4 p-5 bg-brand-100 rounded-xl border border-brand-200/50">
            <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-800">Our founding belief</p>
              <p className="text-sm text-brand-600">Every Zimbabwean business — from a Harare fintech to a Bulawayo manufacturer — deserves to know where it&apos;s exposed.</p>
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="bg-brand-100 rounded-2xl p-6 border border-brand-200">
            <p className="text-xs text-brand-500 uppercase tracking-widest mb-4 font-medium">Zimbabwe by the numbers</p>
            <div className="space-y-3">
              {[
                { label: 'EcoCash registered accounts', value: '10M+' },
                { label: 'Mobile money transactions/month', value: '700M+' },
                { label: 'Organizations without a DPO', value: '62%' },
                { label: 'Firms lacking basic cybersecurity', value: '70%+' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-brand-200/50 last:border-0">
                  <span className="text-sm text-brand-600">{label}</span>
                  <span className="text-sm font-bold text-brand-800 font-[family-name:var(--font-display)]">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-brand-100/50 rounded-xl p-4 text-center border border-brand-200/50">
              <div className="text-xl sm:text-2xl font-bold text-sev-critical font-[family-name:var(--font-display)]">$35K+</div>
              <div className="text-xs text-brand-600 mt-1">Min. cost of Western tools</div>
            </div>
            <div className="bg-brand-100/50 rounded-xl p-4 text-center border border-brand-200/50">
              <div className="text-xl sm:text-2xl font-bold text-brand-500 font-[family-name:var(--font-display)]">$49</div>
              <div className="text-xs text-brand-600 mt-1">Guardian monthly price</div>
            </div>
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
        <p className="text-xs text-brand-500 uppercase tracking-widest mb-3 font-medium">// Compliance Across Africa</p>
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
    <section className="py-16 sm:py-20 bg-brand-50 border-y border-brand-200/50">
      <div className="max-w-2xl mx-auto px-6 text-center reveal">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-200 text-brand-600 text-xs font-medium mb-6">
          <Lock className="w-3.5 h-3.5" /> Early Access
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] mb-4">
          Be first to know when we launch.
        </h2>
        <p className="text-brand-600 mb-8 max-w-lg mx-auto">
          Join the waitlist for early access, founding partner pricing, and priority onboarding.
        </p>

        {status === 'success' ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-green-800">
            <CheckCircle className="w-8 h-8 mx-auto mb-3 text-green-500" />
            <p className="font-semibold">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-brand-200 text-brand-800 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
            <input
              type="text"
              placeholder="Company (optional)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-brand-200 text-brand-800 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-4 py-3 rounded-xl bg-white border border-brand-200 text-brand-800 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white rounded-xl font-semibold transition-all text-sm whitespace-nowrap"
              >
                {status === 'submitting' ? 'Joining...' : 'Join Waitlist'}
              </button>
            </div>
            {status === 'error' && (
              <p className="text-red-500 text-sm">{message}</p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
