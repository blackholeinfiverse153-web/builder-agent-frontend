import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terminal, Shield, Lock, Mail, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../components/common/Button';

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { login, register, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const validate = () => {
    setValidationError(null);
    clearError();
    if (!email.trim() || !email.includes('@')) {
      setValidationError('Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (isRegister) {
        await register(email, password, fullName.trim() || undefined);
      } else {
        await login(email, password);
      }
      navigate(from, { replace: true });
    } catch {
      // Error is stored in auth context
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col justify-center items-center p-4 selection:bg-brand-500 selection:text-white">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/40 flex items-center justify-center text-brand-400 font-bold">
          <Terminal className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-tight leading-none">
            BHIV BUILDER AGENT
          </h1>
          <p className="text-[11px] font-mono text-brand-400 mt-0.5">SECURE SANDBOX PLATFORM</p>
        </div>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md rounded-2xl border border-surface-800 bg-surface-900/60 backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl -z-10" />

        {/* Tab Switcher */}
        <div className="flex border-b border-surface-800 mb-6 font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              clearError();
              setValidationError(null);
            }}
            className={`flex-1 pb-3 text-center transition-colors border-b-2 font-medium ${
              !isRegister
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-surface-500 hover:text-surface-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              clearError();
              setValidationError(null);
            }}
            className={`flex-1 pb-3 text-center transition-colors border-b-2 font-medium ${
              isRegister
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-surface-500 hover:text-surface-300'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Banners */}
        {(validationError || error) && (
          <div className="p-3 mb-5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError || error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5 font-mono">
                Full Name (Optional)
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-surface-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Jane Developer"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-surface-600 focus:outline-none focus:border-brand-500 transition-colors font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5 font-mono">
              Email Address <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-surface-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="developer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-surface-950 border border-surface-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-surface-600 focus:outline-none focus:border-brand-500 transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5 font-mono">
              Password <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-surface-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-surface-950 border border-surface-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-surface-600 focus:outline-none focus:border-brand-500 transition-colors font-mono"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            loading={loading}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            {isRegister ? 'Register Account' : 'Sign In to Workspace'}
          </Button>
        </form>

        {/* Security Notice */}
        <div className="mt-6 pt-5 border-t border-surface-800/80 flex items-center justify-between text-[11px] font-mono text-surface-500">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            JWT Token Guard
          </span>
          <span>Bcrypt Hashed</span>
        </div>
      </div>
    </div>
  );
};
