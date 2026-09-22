'use client';

import { FC } from 'react';
import Image from 'next/image';
import sebiLogo from '../assets/SEBI-logo.png';

interface ClientLogoProps {
  className?: string;
  logoHeight: number;
}

// Show only the emblem, not the full lockup: the asset is the SEBI mark followed by the
// Hindi + English wordmark, and the clip keeps the leftmost quarter (the mark alone).
const CLIP = 'polygon(0 0, 25% 0%, 25% 100%, 0 100%)';

// Intrinsic size of SEBI-logo.png. Both width and height are passed to next/image derived from
// this, so the element's own attributes stay in proportion — passing height alone leaves the
// intrinsic width in place and next/image warns that the aspect ratio was modified.
const ASSET_W = 450;
const ASSET_H = 51;
const VISIBLE = 0.25; // the clip keeps the leftmost quarter (the emblem)

const ClientLogo: FC<ClientLogoProps> = ({ className = "", logoHeight }) => {
  const renderedWidth = Math.round(logoHeight * (ASSET_W / ASSET_H));
  // Width comes from the asset's own aspect ratio (SEBI's mark is ~8.8:1, the old NSE one was 1:1),
  // so a hardcoded ratio would distort whichever logo it was not written for.
  //
  // clip-path paints less but does NOT shrink the layout box, so the wrapper is capped at the
  // same 25% and hides the overflow — otherwise the element still reserves its full width and
  // leaves a large empty gap beside the mark in the flex row.
  return (
    <span
      className="block self-center overflow-hidden"
      style={{ height: `${logoHeight}px`, width: `${Math.round(renderedWidth * VISIBLE)}px` }}
    >
      <Image
        src={sebiLogo}
        alt="SEBI logo"
        width={renderedWidth}
        height={logoHeight}
        style={{ maxWidth: 'none', clipPath: CLIP }}
        className={`block ${className}`}
        priority
      />
    </span>
  );
};

export default ClientLogo;
