import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-surface-base relative overflow-hidden">
      {/* Background gradient animation */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full rounded-full bg-gradient-to-bl from-primary/5 via-transparent to-transparent blur-3xl" style={{ animation: 'float 30s ease-in-out infinite' }} />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full bg-gradient-to-tr from-info/3 via-transparent to-transparent blur-3xl" style={{ animation: 'float 35s ease-in-out infinite -7s' }} />
      </div>
      
      <AppSidebar isOpen={isSidebarOpen} />
      <div
        className="transition-[margin] duration-300 relative z-0"
        style={{ marginLeft: isSidebarOpen ? 240 : 0 }}
      >
        <Topbar isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setSidebarOpen(v => !v)} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
