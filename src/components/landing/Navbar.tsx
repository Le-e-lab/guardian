'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Shield, ArrowRight, X, Zap, Globe, CreditCard, Home } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const NAV_LINKS = [
  { href: '/how-it-works', label: 'How It Works', icon: Zap, desc: 'The 60-second process' },
  { href: '/features', label: 'Features', icon: Globe, desc: 'Capabilities & differentiators' },
  { href: '/pricing', label: 'Pricing', icon: CreditCard, desc: 'Built for African budgets' },
];

interface NavbarProps {
  onSignIn?: () => void;
}

export default function Navbar({ onSignIn }: NavbarProps) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const pathname = usePathname();

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
    const onScroll = () => setCondensed(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      {/* ==================== DESKTOP: FLOATING COMMAND BAR ==================== */}
      <div className="hidden md:block fixed top-4 left-0 right-0 z-50 px-6">
        <div className={`mx-auto max-w-3xl transition-all duration-500 ease-out ${
          condensed ? 'max-w-2xl' : 'max-w-3xl'
        }`}>
          <div className={`
            relative flex items-center gap-2
            rounded-2xl
            bg-surface/70 backdrop-blur-2xl
            border border-brand-200/40
            shadow-lg shadow-brand-900/[0.04]
            transition-all duration-500 ease-out
            ${condensed ? 'px-3 py-2' : 'px-4 py-2.5'}
          `}>
            {/* Subtle gradient border glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-brand-300/20 via-transparent to-brand-300/20 pointer-events-none" />

            {/* Logo */}
            <a href="/" className="relative flex items-center gap-2 group flex-shrink-0">
              <div className={`rounded-lg bg-brand-500 flex items-center justify-center transition-all duration-300 group-hover:bg-brand-600 ${
                condensed ? 'w-7 h-7' : 'w-8 h-8'
              }`}>
                <Shield className={`text-white transition-all duration-300 ${condensed ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              </div>
              <span className={`font-bold tracking-tight font-[family-name:var(--font-display)] text-brand-800 transition-all duration-300 ${
                condensed ? 'text-sm' : 'text-base'
              }`}>GUARDIAN</span>
            </a>

            {/* Center spacer */}
            <div className="flex-1" />

            {/* Nav links — inline pills */}
            <nav className="relative flex items-center gap-0.5">
              {NAV_LINKS.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <a key={href} href={href}
                    className={`
                      relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                      ${active
                        ? 'text-brand-800 bg-brand-100'
                        : 'text-brand-500 hover:text-brand-700 hover:bg-brand-100/50'
                      }
                    `}>
                    {label}
                  </a>
                );
              })}
            </nav>

            {/* Divider */}
            <div className="w-px h-5 bg-brand-200/60 mx-1" />

            {/* CTA */}
            {user ? (
              <a href="/dashboard"
                className="relative px-4 py-1.5 bg-brand-500 hover:bg-brand-600 rounded-xl text-sm font-semibold text-white transition-all btn-brand inline-flex items-center gap-1.5 flex-shrink-0">
                Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button onClick={onSignIn}
                className="relative px-4 py-1.5 bg-brand-500 hover:bg-brand-600 rounded-xl text-sm font-semibold text-white transition-all btn-brand flex-shrink-0 cursor-pointer">
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ==================== MOBILE: FLOATING PILL ==================== */}
      <div className="md:hidden fixed top-3 left-3 right-3 z-50">
        <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-surface/70 backdrop-blur-2xl border border-brand-200/40 shadow-lg shadow-brand-900/[0.04]">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center transition-all group-hover:bg-brand-600">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight font-[family-name:var(--font-display)] text-brand-800">GUARDIAN</span>
          </a>
          <button onClick={() => setMobileOpen(true)}
            className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 hover:bg-brand-200 transition-colors"
            aria-label="Open menu">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ==================== MOBILE: FULL-SCREEN OVERLAY ==================== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-brand-900/30 backdrop-blur-md" onClick={() => setMobileOpen(false)} />

          {/* Panel */}
          <div className="absolute inset-x-0 bottom-0 bg-surface rounded-t-3xl shadow-2xl shadow-brand-900/20 animate-slide-up max-h-[85vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-brand-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-bold tracking-tight font-[family-name:var(--font-display)] text-brand-800">GUARDIAN</span>
              </div>
              <button onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center text-brand-500 hover:bg-brand-200 transition-colors"
                aria-label="Close menu">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Links — large, card-style */}
            <nav className="px-4 pb-4 space-y-2">
              {/* Home */}
              <a href="/" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-brand-100/60 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center group-hover:bg-brand-200 transition-colors">
                  <Home className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-800">Home</p>
                  <p className="text-xs text-brand-500">Landing page &amp; mission</p>
                </div>
              </a>

              {NAV_LINKS.map(({ href, label, icon: Icon, desc }) => (
                <a key={href} href={href} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-brand-100/60 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center group-hover:bg-brand-200 transition-colors">
                    <Icon className="w-5 h-5 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-800">{label}</p>
                    <p className="text-xs text-brand-500">{desc}</p>
                  </div>
                </a>
              ))}
            </nav>

            {/* CTA */}
            <div className="px-6 pb-8 pt-2">
              {user ? (
                <a href="/dashboard" onClick={() => setMobileOpen(false)}
                  className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 rounded-2xl text-sm font-semibold text-white transition-all btn-brand text-center block inline-flex items-center justify-center gap-2">
                  Open Dashboard <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
                <button onClick={() => { setMobileOpen(false); onSignIn?.(); }}
                  className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 rounded-2xl text-sm font-semibold text-white transition-all btn-brand text-center cursor-pointer">
                  Sign In
                </button>
              )}
              <p className="text-center text-xs text-brand-400 mt-3">Built in Harare, Zimbabwe</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
