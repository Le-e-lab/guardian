import type { Metadata } from 'next';
import { Funnel_Display, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const funnelDisplay = Funnel_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SENTARI — Cybersecurity Compliance for Zimbabwe',
  description: 'AI-powered cybersecurity compliance scanning for Zimbabwe. Automated assessments, audit-ready reports, and remediation guidance. Data sovereign. From $49/mo.',
  keywords: ['cybersecurity', 'Zimbabwe', 'compliance', 'data protection', 'POPIA', 'EcoCash', 'Harare', 'AI security', 'audit-ready', 'vulnerability scanning'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${funnelDisplay.variable} ${ibmPlexSans.variable}`}>
      <body className={`${ibmPlexSans.className} antialiased`}>{children}</body>
    </html>
  );
}
