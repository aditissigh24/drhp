'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';
import InvestorLogos from './InvestorLogos';

interface BackedByProps {
  className?: string;
}

const BackedBy: FC<BackedByProps> = ({ className = "" }) => {
  return (
    <motion.div 
      className={`w-full ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
    >
      {/* Backed By text with pierced line */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 transform -translate-y-0.5"></div>
        </div>
        <div className="relative px-3 transform -translate-y-0.5" style={{ backgroundColor: '#EBF2FF' }}>
          <span className="text-gray-400 text-sm font-medium tracking-[0.2em] italic font-montserrat">
            backed by
          </span>
        </div>
      </div>

      {/* Investor Logos */}
      <InvestorLogos />
    </motion.div>
  );
};

export default BackedBy;
