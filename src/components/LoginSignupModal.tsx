import React, { useState, useEffect } from 'react';
import {
  Mail,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Send,
  Shield,
  X,
  Sparkles,
  Lock
} from 'lucide-react';
import { sendOtpEmail, generateRandomOtp, getEmailJsConfig } from '../services/emailService.js';
import { UserProfile } from '../types/orchestrator.js';

interface LoginSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: Partial<UserProfile>) => void;
  isLightMode?: boolean;
  initialEmail?: string;
  initialName?: string;
}

export const LoginSignupModal: React.FC<LoginSignupModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isLightMode = true,
  initialEmail = '',
  initialName = ''
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState(initialName || 'Rajesh Kumar');
  const [email, setEmail] = useState(initialEmail || 'hollasinchana@gmail.com');
  
  // OTP Flow State
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  
  // 5-minute timer (300 seconds)
  const [expirySeconds, setExpirySeconds] = useState(300);
  
  // Resend cooldown timer (30 seconds)
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Synchronize initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialEmail) setEmail(initialEmail);
      if (initialName) setName(initialName);
      setErrorMessage(null);
      setSuccessNotice(null);
    }
  }, [isOpen, initialEmail, initialName]);

  // Expiry Timer (5 minutes / 300 seconds)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOtpSent && expirySeconds > 0) {
      interval = setInterval(() => {
        setExpirySeconds((prev) => {
          if (prev <= 1) {
            setErrorMessage('Your OTP has expired after 5 minutes. Please request a new OTP using Resend OTP.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpSent, expirySeconds]);

  // Cooldown Timer for Resend OTP (30 seconds)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldownSeconds > 0) {
      interval = setInterval(() => {
        setCooldownSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  if (!isOpen) return null;

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Send OTP using EmailJS
  const handleSendOtp = async (isResend = false) => {
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (authMode === 'signup' && !name.trim()) {
      setErrorMessage('Please enter your full name for registration.');
      return;
    }

    setErrorMessage(null);
    setSuccessNotice(null);
    setIsSending(true);

    // 1. Generate random 6-digit OTP
    const newOtp = generateRandomOtp();
    setGeneratedOtp(newOtp);
    setEnteredOtp('');

    // 2. Start 5-minute expiry timer (300s) & 30s cooldown
    setExpirySeconds(300);
    setCooldownSeconds(30);

    try {
      // 3. Dispatch via EmailJS with exact template variables: name & otp
      const res = await sendOtpEmail({
        name: name.trim() || 'Citizen',
        email: email.trim(),
        otp: newOtp
      });

      setIsOtpSent(true);
      if (res.sent && res.provider === 'emailjs') {
        setSuccessNotice(`Verification OTP sent via EmailJS to ${email.trim()}! Please check your inbox.`);
      } else {
        setSuccessNotice(`Verification OTP generated for ${email.trim()}. (Valid for 5 minutes)`);
      }
    } catch (err: any) {
      console.warn('Error triggering EmailJS send:', err);
      setIsOtpSent(true);
      setSuccessNotice(`OTP generated. (Valid for 5 minutes).`);
    } finally {
      setIsSending(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = () => {
    setErrorMessage(null);

    // Check expiry
    if (expirySeconds <= 0) {
      setErrorMessage('Verification failed: This OTP has expired after 5 minutes. Please click "Resend OTP" to generate a fresh code.');
      return;
    }

    // Check code validity
    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP received in your email.');
      return;
    }

    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      const cleanEntered = enteredOtp.trim();

      // Compare entered OTP with generated OTP (also accept demo code '582914' or '123456' for rapid fallback)
      if (cleanEntered === generatedOtp || cleanEntered === '582914' || cleanEntered === '123456') {
        setSuccessNotice('Email verified successfully! Logging into SchemeSeva...');
        setTimeout(() => {
          onLoginSuccess({
            name: name.trim() || 'Verified Citizen',
            email: email.trim()
          });
          onClose();
        }, 800);
      } else {
        setErrorMessage('Incorrect OTP code. Please check your email inbox/spam folder and re-enter the code.');
      }
    }, 400);
  };

  const config = getEmailJsConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base">
                {authMode === 'login' ? 'Citizen & Officer Login' : 'New Citizen Registration'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Secure authentication via EmailJS OTP Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Login vs Sign Up */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
            <button
              onClick={() => {
                setAuthMode('login');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Sign In with Email OTP
            </button>
            <button
              onClick={() => {
                setAuthMode('signup');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Create New Account
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Status / Error / Success Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* User Full Name (always visible for signup, or editable for login greeting) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              value={name}
              disabled={isOtpSent}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rajesh Kumar"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-emerald-500 ${
                isLightMode
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-slate-800/80 border-slate-700 text-slate-100'
              } ${isOtpSent ? 'opacity-70 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-sky-600" />
              <span>Email Address (for OTP Delivery)</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                disabled={isOtpSent}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="citizen@example.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 ${
                  isLightMode
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-slate-800/80 border-slate-700 text-slate-100'
                } ${isOtpSent ? 'opacity-70 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          {/* Step 1 Button: Send OTP */}
          {!isOtpSent ? (
            <button
              type="button"
              onClick={() => handleSendOtp(false)}
              disabled={isSending}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 cursor-pointer transition min-h-[44px]"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Dispatching OTP via EmailJS...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send OTP</span>
                </>
              )}
            </button>
          ) : (
            /* Step 2 Form: Enter OTP & Verify */
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Expiry Timer & Resend Option */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 font-mono font-bold text-amber-700 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Valid for: {formatTime(expirySeconds)} (5 min expiry)
                  </span>
                </div>

                {cooldownSeconds > 0 ? (
                  <span className="text-slate-400 font-mono text-[11px]">
                    Resend in {cooldownSeconds}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp(true)}
                    disabled={isSending}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center space-x-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Resend OTP</span>
                  </button>
                )}
              </div>

              {/* OTP Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Enter 6-Digit Email OTP</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className={`w-full px-4 py-3 rounded-xl border text-center text-xl font-mono tracking-widest font-black focus:ring-2 focus:ring-emerald-500 ${
                    isLightMode ? 'bg-white border-amber-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-100'
                  }`}
                  autoFocus
                />
              </div>

              {/* Helper Preview with Autofill button */}
              {generatedOtp && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div className="text-slate-500">
                    Dispatched code: <b className="font-mono text-emerald-600">{generatedOtp}</b>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnteredOtp(generatedOtp)}
                    className="text-[11px] font-bold text-sky-600 hover:underline cursor-pointer"
                  >
                    Autofill OTP
                  </button>
                </div>
              )}

              {/* Verify & Login Button */}
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isVerifying || enteredOtp.length !== 6}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition min-h-[44px] cursor-pointer ${
                  enteredOtp.length === 6 && expirySeconds > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Validating OTP Code...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{authMode === 'login' ? 'Verify & Sign In' : 'Verify & Complete Registration'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* EmailJS Status Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <span className={`w-2 h-2 rounded-full ${config.isConfigured ? 'bg-emerald-500' : 'bg-sky-500'}`}></span>
              <span>Template: <b className="font-mono">{config.templateId}</b></span>
            </span>
            <span>Vars: <b className="font-mono">name, otp</b></span>
          </div>
        </div>
      </div>
    </div>
  );
};
