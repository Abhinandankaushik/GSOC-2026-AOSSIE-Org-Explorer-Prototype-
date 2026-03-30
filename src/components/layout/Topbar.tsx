import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Topbar() {
  const { org, syncData, isLoading, rateLimit } = useAppStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await syncData();
    setSyncing(false);
  };

  return (
    <header className="h-14 glass sticky top-0 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        {org && (
          <div className="flex items-center gap-2">
            <img src={org.avatar_url} alt={org.login} className="w-6 h-6 rounded-full" />
            <span className="text-sm font-medium text-foreground">{org.name || org.login}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!isOnline && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs">
            <WifiOff className="w-3 h-3" />
            Offline
          </div>
        )}
        {isOnline && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wifi className="w-3 h-3 text-success" />
            <span className="font-mono">{rateLimit.remaining}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={syncing || isLoading}
          className="text-xs gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          Sync Now
        </Button>
      </div>
    </header>
  );
}
