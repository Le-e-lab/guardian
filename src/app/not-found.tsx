import Link from 'next/link';
import { Shield, ShieldAlert, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center py-16">
        {/* Mark */}
        <div className="relative mx-auto w-16 h-16 mb-8">
          <div className="absolute inset-0 rounded-2xl bg-brand-500/15" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-8 h-8 text-brand-500" />
          </div>
        </div>

        <p className="text-xs text-brand-500 uppercase tracking-widest mb-3 font-medium">404 — Nothing here</p>

        <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] text-brand-800 mb-4 leading-tight">
          This page doesn&apos;t exist.
        </h1>

        <p className="text-brand-600 leading-relaxed mb-8">
          Either the link is wrong, or the page was moved. Either way, nothing on this route is exposed.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-3 bg-accent-500 hover:bg-accent-600 rounded-xl font-semibold text-white transition-all btn-brand inline-flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" /> Back to home
          </Link>
          <Link
            href="/scan"
            className="px-6 py-3 bg-transparent border-2 border-brand-200 hover:border-brand-400 rounded-xl font-semibold text-brand-700 transition-all inline-flex items-center gap-2"
          >
            Run a free scan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
