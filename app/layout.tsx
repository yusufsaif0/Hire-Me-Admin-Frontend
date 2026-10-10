import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Trusted Assistance | Pilot workspace',
  description: 'Local foundation for trusted, non-medical family and elderly assistance.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
