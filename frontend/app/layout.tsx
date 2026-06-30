import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import ShaderBackground from '@/components/ui/shader-background';

export const metadata: Metadata = {
  title: 'Medical Symptom Checker',
  description:
    'Describe your symptoms and get OTC medication suggestions with citations from Wikipedia Medical and FDA databases. Always consult a doctor.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <body className="h-full m-0 antialiased overflow-hidden">
        <ShaderBackground />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
