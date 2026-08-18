import './globals.css';

export const metadata = {
  title: 'NSE - Due Diligence — Manipal Health Enterprises Limited',
  description: 'Marks every binding representation in the Our Business section of the Manipal Health Enterprises Limited DRHP.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
