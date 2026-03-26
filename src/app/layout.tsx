import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'EventStock Management',
  description: 'Scalable multi-user inventory management system',
};

import MobileHeader from '@/components/MobileHeader';

import LayoutWrapper from '@/components/LayoutWrapper';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
