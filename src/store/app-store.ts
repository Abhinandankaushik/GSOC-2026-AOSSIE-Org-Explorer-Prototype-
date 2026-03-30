import { create } from 'zustand';
import type { GHOrg, GHRepo, GHContributor, GHEvent } from '@/lib/github-client';
import { githubFetch, githubPaginateAll, getRateLimitInfo } from '@/lib/github-client';
import type { HealthScore } from '@/lib/health-score';
import { calculateHealthScore } from '@/lib/health-score';

interface AppState {
  // Auth
  pat: string;
  setPat: (pat: string) => void;
  
  // Org
  orgName: string;
  setOrgName: (name: string) => void;
  org: GHOrg | null;
  
  // Data
  repos: GHRepo[];
  contributors: Map<string, GHContributor[]>;
  allContributors: GHContributor[];
  events: GHEvent[];
  healthScores: Map<number, HealthScore>;
  languages: Map<string, number>;
  
  // UI
  isLoading: boolean;
  error: string | null;
  isSetup: boolean;
  
  // Rate limit
  rateLimit: { remaining: number; limit: number; resetAt: number };
  
  // Actions
  loadOrg: () => Promise<void>;
  clearData: () => void;
  syncData: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  pat: localStorage.getItem('org-explorer-pat') || '',
  orgName: localStorage.getItem('org-explorer-active-org') || '',
  org: null,
  repos: [],
  contributors: new Map(),
  allContributors: [],
  events: [],
  healthScores: new Map(),
  languages: new Map(),
  isLoading: false,
  error: null,
  isSetup: !localStorage.getItem('org-explorer-active-org'),
  rateLimit: { remaining: 5000, limit: 5000, resetAt: 0 },

  setPat: (pat) => {
    localStorage.setItem('org-explorer-pat', pat);
    set({ pat });
  },

  setOrgName: (name) => {
    localStorage.setItem('org-explorer-active-org', name);
    set({ orgName: name });
  },

  loadOrg: async () => {
    const { orgName, pat } = get();
    if (!orgName) return;

    set({ isLoading: true, error: null });
    
    try {
      // Fetch org info
      const org = await githubFetch<GHOrg>(`/orgs/${orgName}`, pat || undefined);
      set({ org });

      // Fetch repos
      const repos = await githubPaginateAll<GHRepo>(`/orgs/${orgName}/repos?sort=pushed`, pat || undefined, 5);
      set({ repos });

      // Compute language aggregation
      const langMap = new Map<string, number>();
      repos.forEach(r => {
        if (r.language) {
          langMap.set(r.language, (langMap.get(r.language) || 0) + 1);
        }
      });
      set({ languages: langMap });

      // Fetch events
      try {
        const events = await githubFetch<GHEvent[]>(`/orgs/${orgName}/events?per_page=50`, pat || undefined);
        set({ events });
      } catch { /* events are optional */ }

      // Fetch contributors for top repos (limit to save rate limit)
      const topRepos = repos.slice(0, 20);
      const contribMap = new Map<string, GHContributor[]>();
      const allContribMap = new Map<string, GHContributor>();
      
      for (const repo of topRepos) {
        try {
          const contribs = await githubFetch<GHContributor[]>(
            `/repos/${orgName}/${repo.name}/contributors?per_page=30`,
            pat || undefined
          );
          contribMap.set(repo.name, contribs);
          contribs.forEach(c => {
            if (c.type === 'User') {
              const existing = allContribMap.get(c.login);
              if (existing) {
                existing.contributions += c.contributions;
              } else {
                allContribMap.set(c.login, { ...c });
              }
            }
          });
        } catch { /* skip */ }
      }
      
      set({ 
        contributors: contribMap, 
        allContributors: Array.from(allContribMap.values()).sort((a, b) => b.contributions - a.contributions),
      });

      // Compute health scores (simplified without commits/PRs/issues for initial load)
      const scores = new Map<number, HealthScore>();
      repos.forEach(r => {
        scores.set(r.id, calculateHealthScore(r));
      });
      set({ healthScores: scores });

      set({ isSetup: false, rateLimit: getRateLimitInfo() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      set({ isLoading: false });
    }
  },

  clearData: () => {
    localStorage.removeItem('org-explorer-pat');
    localStorage.removeItem('org-explorer-active-org');
    // Clear cached data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('etag:') || key.startsWith('cache:')) {
        localStorage.removeItem(key);
      }
    });
    set({
      pat: '', orgName: '', org: null, repos: [], contributors: new Map(),
      allContributors: [], events: [], healthScores: new Map(), languages: new Map(),
      isSetup: true, error: null,
    });
  },

  syncData: async () => {
    // Clear ETags to force fresh fetch
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('etag:')) localStorage.removeItem(key);
    });
    await get().loadOrg();
  },
}));
