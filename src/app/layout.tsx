import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SENTARI — Africa-First Threat Intelligence',
  description: 'AI-native offensive cyber validation platform built for Africa\'s unique infrastructure and data sovereignty requirements.',
  keywords: ['cybersecurity', 'Africa', 'threat intelligence', 'penetration testing', 'vulnerability assessment'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
