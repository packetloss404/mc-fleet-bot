import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: {
    default: 'IANLAN NextGen — Reports',
    template: '%s · IANLAN NextGen',
  },
  description: 'A private report library for master plans, project records, investigations, and verified delivery evidence.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
