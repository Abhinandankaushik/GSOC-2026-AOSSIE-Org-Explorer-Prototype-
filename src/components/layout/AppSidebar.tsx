import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, GitFork, Users, BarChart3, Network, Settings, Search, Zap
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/repositories', label: 'Repositories', icon: GitFork },
  { path: '/contributors', label: 'Contributors', icon: Users },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/network', label: 'Network', icon: Network },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function AppSidebar() {
  const location = useLocation();
  const org = useAppStore(s => s.org);

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] glass z-50 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Search className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Org Explorer</h1>
            <p className="text-[10px] text-muted-foreground font-mono">
              {org?.login || 'GitHub Analytics'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-accent"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon className={`relative z-10 w-4 h-4 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              }`} />
              <span className={`relative z-10 transition-colors ${
                isActive ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-foreground'
              }`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Rate Limit */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="w-3 h-3" />
          <span className="font-mono">
            {useAppStore.getState().rateLimit.remaining} / {useAppStore.getState().rateLimit.limit}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">API Rate Limit</p>
      </div>
    </aside>
  );
}
