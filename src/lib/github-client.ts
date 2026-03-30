const GITHUB_API = 'https://api.github.com';
const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: number;
}

let rateLimitInfo: RateLimitInfo = { remaining: 5000, limit: 5000, resetAt: 0 };

function getHeaders(pat?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (pat) headers['Authorization'] = `Bearer ${pat}`;
  return headers;
}

function updateRateLimit(headers: Headers) {
  const remaining = headers.get('X-RateLimit-Remaining');
  const limit = headers.get('X-RateLimit-Limit');
  const reset = headers.get('X-RateLimit-Reset');
  if (remaining) rateLimitInfo.remaining = parseInt(remaining);
  if (limit) rateLimitInfo.limit = parseInt(limit);
  if (reset) rateLimitInfo.resetAt = parseInt(reset) * 1000;
}

export function getRateLimitInfo(): RateLimitInfo {
  return { ...rateLimitInfo };
}

export async function githubFetch<T>(endpoint: string, pat?: string): Promise<T> {
  if (rateLimitInfo.remaining < 10 && Date.now() < rateLimitInfo.resetAt) {
    throw new Error(`Rate limit exceeded. Resets at ${new Date(rateLimitInfo.resetAt).toLocaleTimeString()}`);
  }

  const etag = localStorage.getItem(`etag:${endpoint}`);
  const headers = getHeaders(pat);
  if (etag) headers['If-None-Match'] = etag;

  const res = await fetch(`${GITHUB_API}${endpoint}`, { headers });
  updateRateLimit(res.headers);

  if (res.status === 304) {
    const cached = localStorage.getItem(`cache:${endpoint}`);
    if (cached) return JSON.parse(cached);
  }

  if (res.status === 401) throw new Error('Invalid PAT. Check your token.');
  if (res.status === 403) throw new Error('Rate limit exceeded or insufficient permissions.');
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);

  const newEtag = res.headers.get('ETag');
  if (newEtag) localStorage.setItem(`etag:${endpoint}`, newEtag);

  const data = await res.json();
  try {
    localStorage.setItem(`cache:${endpoint}`, JSON.stringify(data));
  } catch {
    // localStorage full
  }
  return data;
}

export async function githubPaginateAll<T>(endpoint: string, pat?: string, maxPages = 10): Promise<T[]> {
  let all: T[] = [];
  let page = 1;
  
  while (page <= maxPages) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const data = await githubFetch<T[]>(`${endpoint}${separator}per_page=100&page=${page}`, pat);
    all = all.concat(data);
    if (data.length < 100) break;
    page++;
  }
  
  return all;
}

export async function githubGraphQL<T>(query: string, variables: Record<string, unknown>, pat?: string): Promise<T> {
  if (!pat) throw new Error('GraphQL requires a PAT');
  
  const res = await fetch(GITHUB_GRAPHQL, {
    method: 'POST',
    headers: {
      ...getHeaders(pat),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  
  updateRateLimit(res.headers);
  if (!res.ok) throw new Error(`GraphQL error: ${res.status}`);
  
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

// Types
export interface GHOrg {
  login: string;
  name: string;
  description: string;
  avatar_url: string;
  public_repos: number;
  followers: number;
  created_at: string;
  html_url: string;
}

export interface GHRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  fork: boolean;
  license: { name: string } | null;
  topics: string[];
  size: number;
  default_branch: string;
  has_wiki: boolean;
  watchers_count: number;
}

export interface GHContributor {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
}

export interface GHCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
    committer: { date: string };
  };
  author: { login: string; avatar_url: string } | null;
  html_url: string;
}

export interface GHPullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: { login: string; avatar_url: string };
  html_url: string;
}

export interface GHIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  closed_at: string | null;
  labels: { name: string; color: string }[];
  user: { login: string; avatar_url: string };
  html_url: string;
}

export interface GHEvent {
  id: string;
  type: string;
  actor: { login: string; avatar_url: string };
  repo: { name: string };
  created_at: string;
  payload: Record<string, unknown>;
}

export interface GHLanguages {
  [language: string]: number;
}
