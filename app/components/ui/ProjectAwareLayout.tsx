import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';

interface ProjectAwareLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showProjectActions?: boolean;
}

export function ProjectAwareLayout({
  children,
  showProjectActions: _showProjectActions = true,
}: ProjectAwareLayoutProps) {
  const files = useStore(workbenchStore.files);
  const _hasFiles = Object.keys(files || {}).length > 0;

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 flex flex-col h-full">{children}</div>
    </div>
  );
}
