'use client';

import { FC } from 'react';
import Image from 'next/image';
import investor1Logo from '../assets/investor1.svg';
import investor2Logo from '../assets/Investor2.svg';
import investor3Logo from '../assets/investor3.svg';
import investor4Logo from '../assets/investor4.svg';

interface InvestorImageSpec {
  imageName: string;
  height: number; // in pixels
  leftPadding: number; // in pixels
  rightPadding: number; // in pixels
}

interface InvestorLogosProps {
  className?: string;
}

const baseHeight = 60;
// const baseGap = -500; // keep negative to make sure the gap is not too large

const investorImageConfig: Record<string, InvestorImageSpec> = {
  investor1: {
    imageName: 'investor1.svg',
    height: baseHeight, // 6rem = 96px (matches current h-[6rem])
    leftPadding: 0,
    rightPadding: 0,
  },
  investor2: {
    imageName: 'Investor2.svg',
    height: baseHeight + 30,
    leftPadding: 0,
    rightPadding: 0,
  },
  investor3: {
    imageName: 'investor3.svg',
    height: baseHeight,
    leftPadding: 0,
    rightPadding: 0,
  },
  investor4: {
    imageName: 'investor4.svg',
    height: baseHeight,
    leftPadding: 0,
    rightPadding: 0,
  },
};

const InvestorLogos: FC<InvestorLogosProps> = ({ className = "" }) => {
  const investors = [
    { name: "Investor 1", logo: investor1Logo, spec: investorImageConfig.investor1 },
    { name: "Investor 2", logo: investor2Logo, spec: investorImageConfig.investor2 },
    { name: "Investor 3", logo: investor3Logo, spec: investorImageConfig.investor3 },
    { name: "Investor 4", logo: investor4Logo, spec: investorImageConfig.investor4 },
  ];

  return (
    <div className={`flex items-center justify-center`}>
      {investors.map((investor, index) => (
        <Image
          key={index}
          src={investor.logo}
          alt={`${investor.name} Logo`}
          style={{ 
            height: `${investor.spec.height}px`,
            marginLeft: `${investor.spec.leftPadding}px`,
            marginRight: `${investor.spec.rightPadding}px`,
          }}
          className="object-contain transition-all duration-300 hover:scale-105"
          priority
        />
      ))}
    </div>
  );
};

export default InvestorLogos;
