import type { Metadata } from 'next';
import { Space_Grotesk, Public_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Guardian — Cybersecurity scanning for Zimbabwe',
  description: 'Scan any domain you own and get a plain-language report of what an attacker would see — security headers, email spoofing risk, exposed files, and more. Built in Harare. Free during beta.',
  keywords: ['cybersecurity', 'Zimbabwe', 'security scan', 'website vulnerability', 'DMARC', 'email spoofing', 'SSL check', 'data protection', 'Harare', 'guardian'],
  applicationName: 'Guardian',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
  themeColor: '#141210',
  openGraph: {
    title: 'Guardian — Cybersecurity scanning for Zimbabwe',
    description: 'Scan your site the way an attacker would, then get plain-language fixes. Built in Harare.',
    siteName: 'Guardian',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${publicSans.variable} ${jetBrainsMono.variable}`}>
      <body className={`${publicSans.className} antialiased`}>{children}</body>
    </html>
  );
}
