import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import ComparisonPage from "./pages/ComparisonPage";
import RepositoriesPage from "./pages/RepositoriesPage";
import RepoDetailPage from "./pages/RepoDetailPage";
import ContributorsPage from "./pages/ContributorsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NetworkPage from "./pages/NetworkPage";
import SettingsPage from "./pages/SettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/repositories" element={<RepositoriesPage />} />
            <Route path="/repo/:repoName" element={<RepoDetailPage />} />
            <Route path="/contributors" element={<ContributorsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
