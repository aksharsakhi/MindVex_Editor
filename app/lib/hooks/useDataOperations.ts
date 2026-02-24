import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getAllChats } from '~/lib/persistence/chats';

type IDBDatabase = globalThis.IDBDatabase;

interface UseDataOperationsOptions {
  customDb?: IDBDatabase;
  onReloadSettings?: () => void;
  onReloadChats?: () => void;
  onResetSettings?: () => void;
  onResetChats?: () => void;
}

const SETTINGS_KEYS = [
  'mindvex_profile',
  'mindvex_features',
  'mindvex_providers',
  'mindvex_ui',
  'mindvex_connections',
  'mindvex_debug',
  'mindvex_updates',
  'bolt.providers',
  'bolt.features',
  'bolt.user',
];

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target?.result as string));
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function useDataOperations({
  customDb,
  onReloadSettings,
  onReloadChats,
  onResetSettings,
  onResetChats,
}: UseDataOperationsOptions = {}) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const handleExportSettings = useCallback(async () => {
    setIsExporting(true);

    try {
      const settings: Record<string, unknown> = {};
      SETTINGS_KEYS.forEach((key) => {
        const val = localStorage.getItem(key);

        if (val) {
          try {
            settings[key] = JSON.parse(val);
          } catch {
            settings[key] = val;
          }
        }
      });

      downloadJson({ version: 1, timestamp: new Date().toISOString(), settings }, 'mindvex-settings.json');
      toast.success('Settings exported');
    } catch {
      toast.error('Failed to export settings');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleExportSelectedSettings = useCallback(async (selectedIds: string[]) => {
    setIsExporting(true);

    try {
      const settings: Record<string, unknown> = {};
      selectedIds.forEach((id) => {
        const key = SETTINGS_KEYS.find((k) => k.toLowerCase().includes(id));

        if (key) {
          const val = localStorage.getItem(key);

          if (val) {
            try {
              settings[key] = JSON.parse(val);
            } catch {
              settings[key] = val;
            }
          }
        }
      });

      downloadJson({ version: 1, timestamp: new Date().toISOString(), settings }, 'mindvex-settings-partial.json');
      toast.success('Selected settings exported');
    } catch {
      toast.error('Failed to export selected settings');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleExportAllChats = useCallback(async () => {
    if (!customDb) {
      toast.error('Database not available');
      return;
    }

    setIsExporting(true);

    try {
      const chats = await getAllChats(customDb as unknown as IDBDatabase);
      downloadJson({ version: 1, timestamp: new Date().toISOString(), chats }, 'mindvex-chats.json');
      toast.success('Chats exported');
    } catch {
      toast.error('Failed to export chats');
    } finally {
      setIsExporting(false);
    }
  }, [customDb]);

  const handleExportSelectedChats = useCallback(
    async (selectedIds: string[]) => {
      if (!customDb) {
        toast.error('Database not available');
        return;
      }

      setIsExporting(true);

      try {
        const allChats = await getAllChats(customDb as unknown as IDBDatabase);
        const selected = allChats.filter((c) => selectedIds.includes(c.id));
        downloadJson(
          { version: 1, timestamp: new Date().toISOString(), chats: selected },
          'mindvex-chats-selected.json',
        );
        toast.success('Selected chats exported');
      } catch {
        toast.error('Failed to export selected chats');
      } finally {
        setIsExporting(false);
      }
    },
    [customDb],
  );

  const handleImportSettings = useCallback(
    async (file: File) => {
      setIsImporting(true);

      try {
        const data = (await readJsonFile(file)) as { settings?: Record<string, unknown> };

        if (!data?.settings) {
          toast.error('Invalid settings file format');
          return;
        }

        Object.entries(data.settings).forEach(([key, value]) => {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        });

        toast.success('Settings imported');
        onReloadSettings?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to import settings');
      } finally {
        setIsImporting(false);
      }
    },
    [onReloadSettings],
  );

  const handleImportChats = useCallback(
    async (_file: File) => {
      /*
       * Chat import via IndexedDB requires more complex handling;
       * for now show a message that it's not yet supported
       */
      toast.info('Chat import is not supported in this version');
      onReloadChats?.();
    },
    [onReloadChats],
  );

  const handleResetSettings = useCallback(async () => {
    setIsResetting(true);

    try {
      SETTINGS_KEYS.forEach((key) => localStorage.removeItem(key));
      toast.success('Settings reset to defaults');
      onResetSettings?.();
      onReloadSettings?.();
    } catch {
      toast.error('Failed to reset settings');
    } finally {
      setIsResetting(false);
    }
  }, [onResetSettings, onReloadSettings]);

  const handleResetChats = useCallback(async () => {
    setIsResetting(true);

    try {
      toast.info('Chat reset requires a page reload');
      onResetChats?.();
    } catch {
      toast.error('Failed to reset chats');
    } finally {
      setIsResetting(false);
    }
  }, [onResetChats]);

  const handleDownloadTemplate = useCallback(async () => {
    setIsDownloadingTemplate(true);

    try {
      const template = {
        version: 1,
        description: 'MindVex settings template',
        settings: Object.fromEntries(SETTINGS_KEYS.map((k) => [k, null])),
      };
      downloadJson(template, 'mindvex-settings-template.json');
    } finally {
      setIsDownloadingTemplate(false);
    }
  }, []);

  const handleImportAPIKeys = useCallback(async (file: File) => {
    try {
      const data = (await readJsonFile(file)) as Record<string, string>;

      if (typeof data !== 'object') {
        toast.error('Invalid API keys file format');
        return;
      }

      const existing = JSON.parse(localStorage.getItem('bolt.providers') || '{}');
      const merged = { ...existing, ...data };
      localStorage.setItem('bolt.providers', JSON.stringify(merged));
      toast.success('API keys imported');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to import API keys');
    }
  }, []);

  return {
    isExporting,
    isImporting,
    isResetting,
    isDownloadingTemplate,
    handleExportSettings,
    handleExportSelectedSettings,
    handleExportAllChats,
    handleExportSelectedChats,
    handleImportSettings,
    handleImportChats,
    handleResetSettings,
    handleResetChats,
    handleDownloadTemplate,
    handleImportAPIKeys,
  };
}
