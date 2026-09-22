// Import order matters. Tailwind's preflight and the shadcn tokens live in
// `tailwind.css` and are wrapped in `@layer base`, which ranks BELOW unlayered
// CSS. `globals.css` — the DRHP reviewer's stylesheet — is unlayered and loads
// second, so it wins every collision. shell.css loads last and corrects the
// few globals.css rules the ported shell cannot live with. Do not reorder.
import './tailwind.css';
import './globals.css';
import './shell.css';

import type { Metadata } from 'next';
import { ClientRootLayout } from './ClientRootLayout';

export const metadata: Metadata = {
  // Generic: the app is no longer a single-company document viewer, it opens
  // on a watchlist. The company name is carried by the breadcrumb instead.
  title: 'NSE — Due Diligence',
  description:
    'Watchlist and claim-level verification for draft red herring prospectuses.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientRootLayout>{children}</ClientRootLayout>
      </body>
    </html>
  );
}
