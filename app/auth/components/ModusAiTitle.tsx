'use client';

import { FC } from 'react';
import { Sparkles } from 'lucide-react';

interface ModusAiTitleProps {
  className?: string;
  logoHeight: number;
  colorScheme?: 'gradient' | 'solid';
}

const ModusAiTitle: FC<ModusAiTitleProps> = ({ className = "", logoHeight, colorScheme = 'solid' }) => {
  // Calculate font size based on logo height (maintaining aspect ratio)
  const fontSize = Math.round(logoHeight * 0.7); // Adjust multiplier as needed
  
  // Color scheme logic
  const modusColor = colorScheme === 'gradient' ? 'text-white' : 'text-[#00285B]';
  const aiColor = colorScheme === 'gradient' 
    ? 'bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent' 
    : 'text-[#00285B]';
  
  return (
    <div className={`relative inline-block ${className}`}>
      <h1 
        className={`font-bold tracking-tight leading-none mb-2 ${modusColor}`}
        style={{ fontSize: `${fontSize}px` }}
      >
        modus <span className={aiColor}>ai</span>
      </h1>
      <div className="absolute -top-4 -right-6 text-[#00285B] animate-pulse">
        <Sparkles size={Math.round(logoHeight * 0.3)} />
      </div>
    </div>
  );
};

export default ModusAiTitle;
