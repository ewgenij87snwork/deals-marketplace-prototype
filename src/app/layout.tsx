import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Deals Marketplace',
  description: 'Fictional M&A marketplace prototype.',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico?v=20260821-corners', sizes: 'any' },
      {
        url: '/favicon-32x32.png?v=20260821-corners',
        type: 'image/png',
        sizes: '32x32',
      },
      {
        url: '/favicon-16x16.png?v=20260821-corners',
        type: 'image/png',
        sizes: '16x16',
      },
    ],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
