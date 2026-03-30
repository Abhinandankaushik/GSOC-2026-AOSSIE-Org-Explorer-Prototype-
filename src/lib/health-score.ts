import type { GHRepo, GHCommit, GHPullRequest, GHIssue } from './github-client';

export type HealthGrade = 'Excellent' | 'Good' | 'Needs Attention' | 'At Risk' | 'Stale';

export interface HealthScore {
  total: number;
  grade: HealthGrade;
  commitFrequency: number;
  issueResolution: number;
  prVelocity: number;
  documentation: number;
  cicd: number;
  recency: number;
}

export function gradeFromScore(score: number): HealthGrade {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs Attention';
  if (score >= 30) return 'At Risk';
  return 'Stale';
}

export function gradeColor(grade: HealthGrade): string {
  switch (grade) {
    case 'Excellent': return 'text-success';
    case 'Good': return 'text-info';
    case 'Needs Attention': return 'text-warning';
    case 'At Risk': return 'text-destructive';
    case 'Stale': return 'text-muted-foreground';
  }
}

export function calculateHealthScore(
  repo: GHRepo,
  commits: GHCommit[] = [],
  prs: GHPullRequest[] = [],
  issues: GHIssue[] = []
): HealthScore {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Commit Frequency (25 points)
  const recentCommits = commits.filter(c => new Date(c.commit.committer.date).getTime() > thirtyDaysAgo).length;
  let commitFrequency = 0;
  if (recentCommits >= 20) commitFrequency = 25;
  else if (recentCommits >= 10) commitFrequency = 20;
  else if (recentCommits >= 5) commitFrequency = 15;
  else if (recentCommits >= 1) commitFrequency = 10;

  // Issue Resolution (20 points)
  const closedIssues = issues.filter(i => i.state === 'closed' && i.closed_at);
  let issueResolution = 0;
  if (closedIssues.length > 0) {
    const quickClosed = closedIssues.filter(i => {
      const created = new Date(i.created_at).getTime();
      const closed = new Date(i.closed_at!).getTime();
      return (closed - created) < 7 * 24 * 60 * 60 * 1000;
    });
    const ratio = quickClosed.length / closedIssues.length;
    if (ratio > 0.8) issueResolution = 20;
    else if (ratio > 0.6) issueResolution = 15;
    else if (ratio > 0.4) issueResolution = 10;
    else issueResolution = 5;
  }

  // PR Velocity (20 points)
  const mergedPRs = prs.filter(p => p.merged_at);
  let prVelocity = 0;
  if (mergedPRs.length > 0) {
    const avgDays = mergedPRs.reduce((sum, p) => {
      const created = new Date(p.created_at).getTime();
      const merged = new Date(p.merged_at!).getTime();
      return sum + (merged - created) / (24 * 60 * 60 * 1000);
    }, 0) / mergedPRs.length;
    if (avgDays < 3) prVelocity = 20;
    else if (avgDays < 7) prVelocity = 15;
    else if (avgDays < 14) prVelocity = 10;
    else prVelocity = 5;
  }

  // Documentation (15 points)
  let documentation = 0;
  if (repo.description) documentation += 5;
  if (repo.license) documentation += 3;
  if (repo.topics && repo.topics.length > 0) documentation += 2;
  if (!repo.archived) documentation += 5; // proxy for README

  // CI/CD (10 points)
  const cicd = 10; // We assume presence; can be refined

  // Recency (10 points)
  const daysSincePush = (now - new Date(repo.pushed_at).getTime()) / (24 * 60 * 60 * 1000);
  let recency = 0;
  if (daysSincePush < 7) recency = 10;
  else if (daysSincePush < 30) recency = 8;
  else if (daysSincePush < 90) recency = 5;

  const total = commitFrequency + issueResolution + prVelocity + documentation + cicd + recency;

  return {
    total,
    grade: gradeFromScore(total),
    commitFrequency,
    issueResolution,
    prVelocity,
    documentation,
    cicd,
    recency,
  };
}
