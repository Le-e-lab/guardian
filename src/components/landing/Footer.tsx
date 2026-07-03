import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-brand-200/50 bg-brand-100/30">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight font-[family-name:var(--font-display)]">GUARDIAN</span>
            </div>
            <p className="text-sm text-brand-600 leading-relaxed max-w-xs mb-3">
              AI-powered cybersecurity compliance platform. Built in Harare, Zimbabwe.
            </p>
            <p className="text-xs text-brand-500">
              Designed &amp; Built by{' '}
              <a href="https://www.elevatevaluepartners.co.zw/" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-500 transition-colors">
                Elevate Value Partners
              </a>
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-brand-800 mb-4 text-sm">Product</h4>
            <ul className="space-y-2.5 text-sm text-brand-600">
              <li><a href="/how-it-works" className="hover:text-brand-500 transition-colors">How It Works</a></li>
              <li><a href="/features" className="hover:text-brand-500 transition-colors">Features</a></li>
              <li><a href="/pricing" className="hover:text-brand-500 transition-colors">Pricing</a></li>
              <li><a href="/dashboard" className="hover:text-brand-500 transition-colors">Dashboard</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-brand-800 mb-4 text-sm">Company</h4>
            <ul className="space-y-2.5 text-sm text-brand-600">
              <li><a href="/" className="hover:text-brand-500 transition-colors">Mission</a></li>
              <li><a href="https://www.elevatevaluepartners.co.zw/about" target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 transition-colors">About EVP</a></li>
              <li><a href="https://www.elevatevaluepartners.co.zw/work" target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 transition-colors">Portfolio</a></li>
              <li><a href="https://www.elevatevaluepartners.co.zw/services" target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 transition-colors">Services</a></li>
            </ul>
          </div>

          {/* Location */}
          <div>
            <h4 className="font-semibold text-brand-800 mb-4 text-sm">Location</h4>
            <ul className="space-y-2.5 text-sm text-brand-600">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Harare, Zimbabwe
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-brand-200/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-brand-500">
            &copy; {new Date().getFullYear()} Guardian. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-brand-500">
            <span className="text-brand-400">Privacy</span>
            <span className="text-brand-400">Terms</span>
            <span className="text-brand-400">Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
