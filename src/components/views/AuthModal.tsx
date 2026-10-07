// SCIP - Professional Authentication Dialog (Login & Registration Flow)
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/scip';
import {
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Shield
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onSuccessNavigate?: (tab: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccessNavigate
}) => {
  const { login, register, switchDemoRole } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Signup Form States
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('citizen');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Status & Error States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const navigateForRole = (role: UserRole) => {
    if (!onSuccessNavigate) return;
    switch (role) {
      case 'citizen':
        onSuccessNavigate('citizen-dashboard');
        break;
      case 'officer':
        onSuccessNavigate('incidents');
        break;
      case 'authority':
        onSuccessNavigate('intel-dashboard');
        break;
      case 'admin':
        onSuccessNavigate('admin-panel');
        break;
      default:
        onSuccessNavigate('citizen-dashboard');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginEmail || !loginPassword) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      onClose();
      // Role will be updated in context; determine destination
      const emailLower = loginEmail.toLowerCase();
      if (emailLower.includes('admin')) {
        navigateForRole('admin');
      } else if (emailLower.includes('director') || emailLower.includes('auth')) {
        navigateForRole('authority');
      } else if (emailLower.includes('officer')) {
        navigateForRole('officer');
      } else {
        navigateForRole('citizen');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signupName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail)) {
      setErrorMessage('Please enter a valid municipal or standard email address.');
      return;
    }

    if (signupPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters in length.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Password and confirmation do not match.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('You must accept the SCIP Terms of Service and Responsible AI Charter.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        role: signupRole,
        phone: signupPhone || undefined
      });
      onClose();
      navigateForRole(signupRole);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. An account with this email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await switchDemoRole(role);
      onClose();
      navigateForRole(role);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate demo user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              SC
            </div>
            <div>
              <h3 id="auth-modal-title" className="font-bold text-slate-900 text-sm tracking-tight leading-none">
                Smart Community Intelligence Platform
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Official Municipal Identity & Role Access
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-2 bg-white">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              mode === 'login'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In to Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              mode === 'signup'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Create New Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ===================== MODE: LOGIN ===================== */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="e.g. citizen.jane@scip.gov"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400">Min. 8 characters</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full text-xs pl-9 pr-9 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Keep me signed in</span>
                </label>

                <span className="text-[11px] text-slate-400">Encrypted with bcrypt</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to SCIP Platform</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Quick Demo Personas for Academic / MCA Evaluators */}
              <div className="pt-4 mt-4 border-t border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Evaluation & Demo Quick-Login</span>
                  <span className="text-[10px] text-emerald-600 font-normal">1-Click Role Switch</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('citizen')}
                    className="p-2 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-all"
                  >
                    <div className="font-semibold text-slate-800">Citizen</div>
                    <div className="text-[10px] text-slate-500">Priya Sharma</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('officer')}
                    className="p-2 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-all"
                  >
                    <div className="font-semibold text-slate-800">Field Officer</div>
                    <div className="text-[10px] text-slate-500">Er. Vikram Sharma (PWD)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('authority')}
                    className="p-2 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-all"
                  >
                    <div className="font-semibold text-slate-800">Authority Director</div>
                    <div className="text-[10px] text-slate-500">Dr. Rajesh Gupta</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('admin')}
                    className="p-2 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-all"
                  >
                    <div className="font-semibold text-slate-800">System Admin</div>
                    <div className="text-[10px] text-slate-500">Adarsh Verma (MCA)</div>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ===================== MODE: SIGNUP ===================== */}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={signupPhone}
                      onChange={e => setSignupPhone(e.target.value)}
                      placeholder="+91-98765-XXXXX"
                      className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intended Platform Role
                </label>
                <select
                  value={signupRole}
                  onChange={e => setSignupRole(e.target.value as UserRole)}
                  className="w-full text-xs px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-all"
                >
                  <option value="citizen">Citizen (Community Member — Observations & Status Tracking)</option>
                  <option value="officer">Field Officer (Department Responder — Investigations & Resolution)</option>
                  <option value="authority">Municipal Authority (Director — Command Dashboard & Decision Support)</option>
                  <option value="admin">System Administrator (Governance, Audits & Platform Config)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password (Min. 8)
                  </label>
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    placeholder="Create secure password"
                    className="w-full text-xs px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={signupConfirmPassword}
                    onChange={e => setSignupConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full text-xs px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={e => setAgreeTerms(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-0 w-3.5 h-3.5 mt-0.5"
                  />
                  <span>
                    I agree to the SCIP Municipal Terms of Service and Responsible AI Governance Charter.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registering Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
