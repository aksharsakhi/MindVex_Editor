import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'react-toastify';
import { Octokit } from '@octokit/rest';
import { setLocalStorage } from '~/lib/persistence/localStorage';
import type { GitHubUserResponse } from '~/types/GitHub';

interface GitHubAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GitHubAuthDialog({ isOpen, onClose }: GitHubAuthDialogProps) {
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!token.trim()) {
      toast.error('Please enter a GitHub token');
      return;
    }

    setIsConnecting(true);

    try {
      const octokit = new Octokit({ auth: token });
      const { data: user } = await octokit.users.getAuthenticated();

      setLocalStorage('github_connection', {
        token,
        user: user as GitHubUserResponse,
        tokenType: 'classic',
        connectedAt: new Date().toISOString(),
      });

      toast.success(`Connected as ${user.login}`);
      setToken('');
      onClose();
    } catch {
      toast.error('Failed to connect. Please check your token and try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[200]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-mindvex-elements-background-depth-1 border border-mindvex-elements-borderColor rounded-xl p-6 w-full max-w-md shadow-2xl">
          <Dialog.Title className="text-lg font-semibold text-mindvex-elements-textPrimary mb-4">
            Connect GitHub Account
          </Dialog.Title>
          <Dialog.Description className="text-sm text-mindvex-elements-textSecondary mb-4">
            Enter a GitHub personal access token with{' '}
            <code className="bg-mindvex-elements-background-depth-2 px-1 rounded text-xs">repo</code> scope to connect
            your account.
          </Dialog.Description>
          <a
            href="https://github.com/settings/tokens/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent-500 hover:underline block mb-4"
          >
            Create a new token on GitHub →
          </a>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2 text-sm bg-mindvex-elements-background-depth-2 border border-mindvex-elements-borderColor rounded-lg text-mindvex-elements-textPrimary placeholder:text-mindvex-elements-textTertiary focus:outline-none focus:ring-2 focus:ring-accent-500 mb-4"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-mindvex-elements-textSecondary hover:text-mindvex-elements-textPrimary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={isConnecting || !token.trim()}
              className="px-4 py-2 text-sm bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
