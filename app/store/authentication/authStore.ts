import { create } from 'zustand';
import { hashPassword } from '@/utils/auth';

interface AuthState {
  isAuthenticated: boolean;
  user: {
    username?: string;
    email?: string;
  } | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  requestId: string | null;
  
  // Auth Actions
  login: (email: string, otp: string) => Promise<void>;
  logout: () => void;
  register: (username: string, email: string, password: string, otp: string) => Promise<boolean>;
  sendOTP: (email: string) => Promise<string | null>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string, confirmPassword: string) => Promise<boolean>;
}

const initializeAuth = () => {
  return {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    isLoading: false,
    error: null,
    requestId: null,
  };
};

const isEmail = (identifier: string): boolean => {
  return identifier.includes('@') && identifier.toLowerCase().endsWith('.com');
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...initializeAuth(),

  login: async (email: string, otp: string) => {
    set({ isLoading: true, error: null });
    try {
      const { requestId } = get();
      
      if (!requestId) {
        throw new Error('No request ID found. Please request a new OTP.');
      }
      
      console.log('Using request_id for login:', requestId);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/auth/login-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          otp: otp,
          request_id: requestId
        })
      });
      
      const data = await response.json();
      console.log('Login response:', data);
      
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }
      
      localStorage.setItem('auth', JSON.stringify({
        isAuthenticated: true,
        accessToken: data.access_token,
        user: { 
          email: email
        }
      }));
      
      set({
        isAuthenticated: true,
        accessToken: data.access_token,
        user: { 
          email: email
        },
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('auth');
    set({
      isAuthenticated: false,
      user: null,
      accessToken: null,
    });
  },

  register: async (username: string, email: string, password: string, otp: string) => {
    set({ isLoading: true, error: null });
    try {
      const hashedPassword = await hashPassword(password);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/auth/register/${otp}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password: hashedPassword }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }
      
      set({
        user: { username: data.username, email: data.email },
      });
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  sendOTP: async (email: string) => {
    set({ isLoading: true, error: null, requestId: null });
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        set({ error: 'User not found or inactive' });
        return null;
      }
      
      // Extract and store the request_id
      if (data && data.request_id) {
        set({ requestId: data.request_id, error: null });
        return data.request_id;
      }
      
      return null;
    } catch (error) {
      console.error('OTP send error:', error); // Detailed error
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/auth/forgot-password?email=${email}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to process forgot password request');
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (email: string, otp: string, newPassword: string, confirmPassword: string) => {
    set({ isLoading: true, error: null });
    try {
      const hashedPassword = await hashPassword(newPassword);
      const hashedConfirmPassword = await hashPassword(confirmPassword);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}api/v1/auth/reset-password?email=${email}&otp=${otp}&new_password=${hashedPassword}&confirm_new_password=${hashedConfirmPassword}`,
        { method: 'POST' }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to reset password');
      }
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
}));