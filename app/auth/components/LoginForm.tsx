import { FC, useState } from 'react';
import { useAuthStore } from '@/app/store/authentication/authStore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Key, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const LoginForm: FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showOtpSuccess, setShowOtpSuccess] = useState(false);
  const { login, sendOTP, isLoading, error } = useAuthStore();
  const router = useRouter();

  // Email validation function
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleSendOTP = async () => {
    if (!email) {
      useAuthStore.setState({ error: 'Please enter your email address' });
      return;
    }

    const trimmedEmail = email.trim();
    if (!validateEmail(trimmedEmail)) {
      useAuthStore.setState({ error: 'Please enter a valid email address' });
      return;
    }

    // Reset success message to trigger animation on resend
    setShowOtpSuccess(false);
    
    const requestId = await sendOTP(trimmedEmail);
    
    if (requestId) {
      setOtpSent(true);
      setOtp(''); // Reset OTP field
      setShowOtpSuccess(true); // Show success notification
      useAuthStore.setState({ error: null }); // Clear any previous errors
    } else {
      setOtpSent(false);
      setShowOtpSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // For OTP login, use login(email, otp)
    await login(email, otp);
    
    // Check if login was successful
    if (useAuthStore.getState().isAuthenticated) {
      router.push('/watchlist');
    }
  };


  return (
    <motion.div 
      className="w-full font-montserrat"
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <div className="text-center mb-3">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Welcome Back</h2>
        <p className="text-slate-600 text-xs">
          Enter your email to receive an OTP
        </p>
      </div>
      
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!otpSent) {
          handleSendOTP();
        } else {
          handleSubmit(e);
        }
             }} className="space-y-3">
         <motion.div 
           className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative">
            <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                // Clear error when user starts typing
                if (error) useAuthStore.setState({ error: null });
              }}
              required
              className={`pl-8 w-full h-8 text-sm ${
                error && !otpSent ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500'
              } font-montserrat`}
              disabled={otpSent}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !otpSent) {
                  e.preventDefault();
                  handleSendOTP();
                }
              }}
              onBlur={() => {
                if (email && !validateEmail(email)) {
                  useAuthStore.setState({ error: 'Please enter a valid email address' });
                }
              }}
            />
          </div>
          
          {!otpSent && (
            <Button
              type="button"
              className="w-full h-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-montserrat disabled:opacity-70 disabled:cursor-not-allowed"
              onClick={handleSendOTP}
              disabled={!email || isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  <span>Sending OTP...</span>
                </div>
              ) : (
                'Send OTP'
              )}
            </Button>
          )}
        </motion.div>
        
        <AnimatePresence>
          {otpSent && (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <AnimatePresence>
                {showOtpSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center space-x-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-green-600 font-medium text-sm font-montserrat">OTP sent successfully</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            
              <motion.div 
                className="relative"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <Key className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="pl-8 w-full h-8 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500 tracking-widest text-left placeholder:text-slate-400 font-montserrat"
                  maxLength={6}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, height: 0 }}
              animate={{ opacity: 1, scale: 1, height: "auto" }}
              exit={{ opacity: 0, scale: 0.95, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center space-x-2">
                <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                <p className="text-red-800 text-xs font-montserrat">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {otpSent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex gap-2"
            >
              <motion.div
                className="flex-1"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
  type="button"
  onClick={handleSendOTP}
  disabled={isLoading}
  className="
    w-full h-8
    bg-transparent
    border border-violet-500
    text-violet-600
    hover:bg-violet-50
    font-medium text-sm
    rounded-lg
    transition-all duration-200
    font-montserrat
    disabled:opacity-60 disabled:cursor-not-allowed
  "
>
  {isLoading ? 'Resending OTP...' : 'Resend OTP'}
</Button>
              </motion.div>
              <motion.div
                className="flex-1"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button 
                  type="submit" 
                  className="w-full h-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-montserrat disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={isLoading || !otp}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      <span>Logging in...</span>
                    </div>
                  ) : (
                    'Login'
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
};