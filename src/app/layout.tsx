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
  title: 'SENTARI — POPIA Compliance Scanner for South Africa',
  description: 'AI-powered POPIA compliance scanning for South Africa. Automated assessments, audit-ready reports, and remediation guidance. Data sovereign. From $49/mo.',
  keywords: ['POPIA', 'data protection', 'compliance', 'South Africa', 'Information Regulator', 'GDPR', 'NDPA', 'Kenya DPA', 'AI compliance', 'audit-ready'],
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
