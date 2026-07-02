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
  title: 'SENTARI — Africa-First AI-Native Cyber Defense',
  description: 'AI-native offensive cyber validation platform built for Africa. Automated vulnerability scanning powered by multi-model AI reasoning. Priced for African budgets.',
  keywords: ['cybersecurity', 'Africa', 'threat intelligence', 'penetration testing', 'vulnerability assessment', 'AI security', 'Zimbabwe', 'Nigeria', 'Kenya'],
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
