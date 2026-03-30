import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, GitFork, Users, BarChart3, Network, Settings, Search, Zap, GitCompare
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';

const baseNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/repositories', label: 'Repositories', icon: GitFork },
  { path: '/contributors', label: 'Contributors', icon: Users },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/network', label: 'Network', icon: Network },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const multiOrgNavItems = [
  { path: '/comparison', label: 'Comparison', icon: GitCompare },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface AppSidebarProps {
  isOpen: boolean;
}

export default function AppSidebar({ isOpen }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const org = useAppStore(s => s.org);
  const mode = useAppStore(s => s.mode);
  const rateLimit = useAppStore(s => s.rateLimit);
  
  const navItems = mode === 'multi' ? multiOrgNavItems : baseNavItems;

  return (
    <aside
      className={`fixed left-0 top-0 h-screen w-[240px] glass z-50 flex flex-col transform transition-transform duration-300 border-r border-border/50 shadow-[4px_0_20px_hsl(0_0%_0%/0.1)] ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Logo */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-5 border-b border-border/50"
      >
        <motion.button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity cursor-pointer w-full bg-transparent border-none p-0"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div 
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
            className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center glow-primary"
          >
            <Search className="w-4 h-4 text-primary-foreground" />
          </motion.div>
          <div className="text-left">
            <h1 className="text-sm font-bold bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">Org Explorer</h1>
            <p className="text-[10px] text-muted-foreground font-mono">
              {org?.login || 'GitHub'}
            </p>
          </div>
        </motion.button>
      </motion.div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <NavLink
                to={item.path}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-accent shadow-[0_0_20px_hsl(263_70%_66%/0.15)]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`relative z-10 w-4 h-4 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                </motion.div>
                <span className={`relative z-10 transition-colors font-medium ${
                  isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                }`}>
                  {item.label}
                </span>
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* Rate Limit */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 border-t border-border/50 bg-gradient-to-t from-accent/20 to-transparent"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-foreground">
            {rateLimit.remaining}
          </span>
          <span className="text-muted-foreground">/ {rateLimit.limit}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">API Rate Limit</p>
      </motion.div>
    </aside>
  );
}
