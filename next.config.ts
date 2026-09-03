import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.groq.com https://api-inference.huggingface.co https://api.github.com https://services.nvd.nist.gov https://cve.circl.lu https://api.abuseipdb.com https://www.virustotal.com https://api.shodan.io https://dns.google; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';"
  },
];

const nextConfig: NextConfig = {
  // Prevents source code exposure. Source maps let anyone read your full
  // source in browser DevTools — must be off for the public showcase.
  productionBrowserSourceMaps: false,
  // Server-side source maps also disabled (kept server-side only if ever needed)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
