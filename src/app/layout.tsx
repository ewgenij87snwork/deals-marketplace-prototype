import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'N5Deal Marketplace Prototype',
  description: 'Fictional M&A marketplace prototype.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
