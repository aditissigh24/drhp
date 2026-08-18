import './globals.css';

export const metadata = {
  title: 'Circle Ups — MHEL DRHP',
  description: 'Marks every binding representation in the Our Business section of the Manipal Health Enterprises DRHP.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
