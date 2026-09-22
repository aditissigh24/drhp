'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { defaultCompany, companyUrlSlug } from '@/app/data/companies';

/** Bare /investigation has no company to show; send it to the default one. */
export default function Page() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/investigation/${companyUrlSlug(defaultCompany)}`);
  }, [router]);
  return null;
}
