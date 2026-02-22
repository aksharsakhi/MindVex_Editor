import { useState, useCallback } from 'react';
import { backendApi } from '~/lib/services/backendApiService';
import { setAuth } from '~/lib/stores/authStore';
import { toast } from 'react-toastify';
import { GitHubButton } from './GitHubButton';

/**
 * Generates a cryptographically strong password
 * @param length - Length of the password (default: 16)
 * @returns A strong password string
 */
function generateStrongPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + special;

  // Use crypto API for secure random generation
  const getSecureRandom = (max: number): number => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);

    return array[0] % max;
  };

  // Ensure at least one character from each category
  let password = '';
  password += uppercase[getSecureRandom(uppercase.length)];
  password += lowercase[getSecureRandom(lowercase.length)];
  password += numbers[getSecureRandom(numbers.length)];
  password += special[getSecureRandom(special.length)];

  // Fill the rest with random characters
  for (let i = 4; i < length; i++) {
    password += allChars[getSecureRandom(allChars.length)];
  }

  // Shuffle the password to randomize character positions
  const shuffled = password.split('');

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = getSecureRandom(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.join('');
}

interface AuthModalProps {
  onClose: () => void;
  allowClose?: boolean;
}

export function AuthModal({ onClose, allowClose = true }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [suggestedPassword, setSuggestedPassword] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);

  // Generate a new strong password suggestion
  const handleGeneratePassword = useCallback(() => {
    const newPassword = generateStrongPassword(16);
    setSuggestedPassword(newPassword);
    setShowSuggestion(true);
    setShowPassword(true); // Show password so user can see the suggestion
  }, []);

  // Use the suggested password
  const handleUseSuggestedPassword = useCallback(() => {
    if (suggestedPassword) {
      setPassword(suggestedPassword);
      setShowSuggestion(false);
      toast.success('Strong password applied!');
    }
  }, [suggestedPassword]);

  // Dismiss the suggestion
  const handleDismissSuggestion = useCallback(() => {
    setShowSuggestion(false);
    setSuggestedPassword(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Direct login with email and password
        const response = await backendApi.login(email, password);
        setAuth(response.token, response.user);
        toast.success('Login successful!');
        onClose();
      } else {
        // Direct registration with email and password
        const response = await backendApi.register(email, password, fullName);
        setAuth(response.token, response.user);
        toast.success('Account created successfully!');
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
        {/* Close button - only show if allowed */}
        {allowClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-red-500 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-500/10"
            aria-label="Close"
          >
            <div className="i-ph:x text-xl" />
          </button>
        )}

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

          {/* GitHub OAuth */}
          <GitHubButton />

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-mindvex-elements-borderColor"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-mindvex-elements-background-depth-2 text-mindvex-elements-textSecondary">
                Or continue with email
              </span>
            </div>
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

              {/* Password Suggestion Feature - Only show during registration */}
              {!isLogin && (
                <div className="mt-3">
                  {!showSuggestion ? (
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="inline-flex items-center gap-2 text-sm text-[#ff6b35] hover:text-[#ff8c61] transition-colors font-medium"
                    >
                      <div className="i-ph:magic-wand text-base" />
                      Suggest Strong Password
                    </button>
                  ) : (
                    <div className="p-3 bg-mindvex-elements-background-depth-1 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="i-ph:shield-check text-green-500" />
                        <span className="text-xs font-medium text-green-500">Strong Password Suggestion</span>
                      </div>
                      <div className="font-mono text-sm text-mindvex-elements-textPrimary bg-black/20 px-3 py-2 rounded mb-3 break-all">
                        {suggestedPassword}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleUseSuggestedPassword}
                          className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
                        >
                          Use this password
                        </button>
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="px-3 py-1.5 bg-mindvex-elements-background-depth-2 hover:bg-mindvex-elements-background-depth-1 text-mindvex-elements-textSecondary hover:text-mindvex-elements-textPrimary text-sm font-medium rounded border border-mindvex-elements-borderColor transition-colors"
                        >
                          <div className="i-ph:arrows-clockwise" />
                        </button>
                        <button
                          type="button"
                          onClick={handleDismissSuggestion}
                          className="px-3 py-1.5 text-mindvex-elements-textSecondary hover:text-red-500 text-sm transition-colors"
                          aria-label="Dismiss suggestion"
                        >
                          <div className="i-ph:x" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
            <span className="text-sm text-mindvex-elements-textSecondary">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail('');
                setPassword('');
                setFullName('');
                setSuggestedPassword(null);
                setShowSuggestion(false);
              }}
              className="text-sm font-medium text-[#ff6b35] hover:text-[#ff8c61] transition-colors underline-offset-4 hover:underline bg-transparent border-none p-0"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
