import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Billing Lead Software',
  description: 'NPPES Provider Management & Cold Calling System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
