import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Medical Symptom Checker',
  description:
    'Describe your symptoms and get OTC medication suggestions with citations from Wikipedia Medical and FDA databases. Always consult a doctor.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
