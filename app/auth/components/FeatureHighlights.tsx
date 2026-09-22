'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';

interface FeatureHighlightsProps {
  className?: string;
}

const FeatureHighlights: FC<FeatureHighlightsProps> = ({ className = "" }) => {
  const features = [
    { text: "Secure", color: "text-green-400" },
    { text: "Reliable", color: "text-blue-400" },
    { text: "AI-Powered", color: "text-purple-400" }
  ];

  return (
    <motion.div 
      className={`text-center ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1.4 }}
    >
      <div className="flex items-center justify-center space-x-8 text-slate-400 text-sm">
        {features.map((feature, index) => (
          <span key={index} className="flex items-center justify-center">
            <svg className={`w-4 h-4 mr-2 ${feature.color} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{feature.text}</span>
          </span>
        ))}
      </div>
    </motion.div>
  );
};

export default FeatureHighlights;
