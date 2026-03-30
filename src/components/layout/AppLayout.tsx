import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-surface-base">
      <AppSidebar />
      <div className="ml-[240px]">
        <Topbar />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
