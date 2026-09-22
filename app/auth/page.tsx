'use client';

import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { SuccessDialog } from './components/SuccessDialog';
import ModusAiTitle from './components/ModusAiTitle';
import ClientLogo from './components/ClientLogo';
import BackedBy from './components/BackedBy';
import FeatureHighlights from './components/FeatureHighlights';
import Image from 'next/image';

const AuthPage: FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Logo height variables
  const modusAiLogoHeight = 90;
  // SEBI's mark is a wide single-line lockup (~8.8:1); matching modus-ai's 90px made it
  // dominate the row. ClientLogo clips to the emblem only, so this is the emblem's height.
  const clientLogoHeight = 50;

  const handleRegistrationSuccess = () => {
    setShowSuccessDialog(true);
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    setIsLogin(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-20 flex flex-col min-h-screen">
        {/* Top Section - Logos */}
        <motion.div 
          className="text-center mb-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="mb-8 flex items-center justify-center gap-8">
            <ModusAiTitle logoHeight={modusAiLogoHeight} colorScheme="solid" />
            <div className="flex items-center justify-center">
              <span className="text-slate-600 text-4xl font-light tracking-wider">×</span>
            </div>
            <ClientLogo logoHeight={clientLogoHeight} />
          </div>
        </motion.div>
        
        {/* Center Section - Login Form + Features */}
        <div className="flex-1 flex flex-col justify-center -mt-12">
          <motion.div
            className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 pt-3 pb-6 px-6 relative overflow-hidden w-96 mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
          >
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-3xl"></div>
            
            <div className="relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? 'login' : 'register'}
                  initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {isLogin ? (
                    <LoginForm />
                  ) : (
                    <RegisterForm onRegistrationSuccess={handleRegistrationSuccess} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Feature Highlights */}
          <FeatureHighlights className="mt-6 w-96 mx-auto" />
        </div>

        {/* Bottom Section - Backed By */}
        <BackedBy className="mb-8" />
      </div>

      <SuccessDialog 
        isOpen={showSuccessDialog} 
        onClose={handleSuccessDialogClose}
      />
    </div>
  );
};

export default AuthPage;