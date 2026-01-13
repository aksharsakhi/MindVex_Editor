import { useState } from 'react';
import { backendApi } from '~/lib/services/backendApiService';
import { setAuth } from '~/lib/stores/authStore';
import { toast } from 'react-toastify';

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { token, user } = await backendApi.login(email, password);
        setAuth(token, user);
        toast.success(`Welcome back, ${user.fullName}!`);
        onClose();
      } else {
        const { token, user } = await backendApi.register(email, password, fullName);
        setAuth(token, user);
        toast.success(`Account created! Welcome, ${user.fullName}!`);
        onClose();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-mindvex-elements-background-depth-2 rounded-lg shadow-2xl border border-mindvex-elements-borderColor">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-mindvex-elements-textSecondary hover:text-mindvex-elements-textPrimary transition-colors"
          aria-label="Close"
        >
          <div className="i-ph:x text-xl" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-mindvex-elements-textPrimary mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-mindvex-elements-textSecondary">
              {isLogin ? 'Sign in to continue to MindVex' : 'Get started with MindVex'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-mindvex-elements-textPrimary mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="w-full px-4 py-2.5 bg-mindvex-elements-background-depth-1 border border-mindvex-elements-borderColor rounded-lg text-mindvex-elements-textPrimary placeholder-mindvex-elements-textSecondary focus:outline-none focus:ring-2 focus:ring-mindvex-elements-button-primary-background transition-all"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-mindvex-elements-textPrimary mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-mindvex-elements-background-depth-1 border border-mindvex-elements-borderColor rounded-lg text-mindvex-elements-textPrimary placeholder-mindvex-elements-textSecondary focus:outline-none focus:ring-2 focus:ring-mindvex-elements-button-primary-background transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-mindvex-elements-textPrimary mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 pr-12 bg-mindvex-elements-background-depth-1 border border-mindvex-elements-borderColor rounded-lg text-mindvex-elements-textPrimary placeholder-mindvex-elements-textSecondary focus:outline-none focus:ring-2 focus:ring-mindvex-elements-button-primary-background transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-mindvex-elements-textSecondary hover:text-mindvex-elements-textPrimary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <div className={showPassword ? 'i-ph:eye-slash text-lg' : 'i-ph:eye text-lg'} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-mindvex-elements-button-primary-background hover:bg-mindvex-elements-button-primary-backgroundHover text-mindvex-elements-button-primary-text font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="i-ph:spinner animate-spin" />
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <p className="text-sm text-mindvex-elements-textSecondary">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmail('');
                  setPassword('');
                  setFullName('');
                }}
                className="font-medium text-mindvex-elements-button-primary-background hover:text-mindvex-elements-button-primary-backgroundHover transition-colors underline-offset-4 hover:underline"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
