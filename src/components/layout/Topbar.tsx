import { RefreshCw, Wifi, WifiOff, Menu, X } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface TopbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Topbar({ isSidebarOpen, onToggleSidebar }: TopbarProps) {
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
    <header className="h-14 glass sticky top-0 z-40 flex items-center justify-between px-6 border-b border-border/50 shadow-[0_4px_20px_hsl(0_0%_0%/0.1)]">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="rounded-lg hover:bg-accent hover:text-foreground transition-colors"
          aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
        {org && (
          <motion.div className="flex items-center gap-3">
            <motion.img 
              src={org.avatar_url} 
              alt={org.login} 
              className="w-6 h-6 rounded-full border border-border" 
              whileHover={{ scale: 1.1 }}
            />
            <span className="text-sm font-semibold text-foreground gradient-text">{org.name || org.login}</span>
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!isOnline && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium border border-warning/30">
            <WifiOff className="w-3 h-3" />
            Offline
          </div>
        )}
        {isOnline && (
          <motion.div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-surface-card/50 border border-border">
            <Wifi className="w-3 h-3 text-success" />
            <span className="font-mono font-semibold">{rateLimit.remaining}</span>
          </motion.div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={syncing || isLoading}
          className="text-xs gap-1.5 hover:bg-accent hover:text-foreground transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </div>
    </header>
  );
}
