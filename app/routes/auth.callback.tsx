import { useEffect } from 'react';
import { useNavigate, useSearchParams } from '@remix-run/react';
import { backendApi } from '~/lib/services/backendApiService';
import { authStore } from '~/lib/stores/authStore';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/?error=' + encodeURIComponent(error));

        return;
      }

      if (token) {
        try {
          // Store token
          localStorage.setItem('auth_token', token);

          // Fetch user data
          const user = await backendApi.getCurrentUser();

          // Update auth store
          authStore.set({
            isAuthenticated: true,
            user,
            token,
            isLoading: false,
          });

          // Redirect to home
          navigate('/');
        } catch (err) {
          console.error('Failed to fetch user data:', err);
          localStorage.removeItem('auth_token');
          navigate('/?error=authentication_failed');
        }
      } else {
        navigate('/?error=no_token');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-mindvex-elements-background-depth-1">
      <div className="text-center">
        <div className="i-ph:spinner animate-spin text-4xl text-mindvex-elements-button-primary-background mb-4" />
        <p className="text-mindvex-elements-textPrimary">Processing authentication...</p>
      </div>
    </div>
  );
}
