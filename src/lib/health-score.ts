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
  if (score >= 85) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 45) return 'Needs Attention';
  if (score >= 25) return 'At Risk';
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

  // ===== Recency (25 points) - Most important differentiator =====
  const daysSincePush = (now - new Date(repo.pushed_at).getTime()) / (24 * 60 * 60 * 1000);
  let recency = 0;
  if (daysSincePush < 3) recency = 25;
  else if (daysSincePush < 7) recency = 22;
  else if (daysSincePush < 14) recency = 18;
  else if (daysSincePush < 30) recency = 14;
  else if (daysSincePush < 60) recency = 8;
  else if (daysSincePush < 90) recency = 4;
  else if (daysSincePush < 180) recency = 2;

  // ===== Community Engagement (20 points) =====
  let commitFrequency = 0;
  if (commits.length > 0) {
    const recentCommits = commits.filter(c => new Date(c.commit.committer.date).getTime() > thirtyDaysAgo).length;
    if (recentCommits >= 20) commitFrequency = 20;
    else if (recentCommits >= 10) commitFrequency = 16;
    else if (recentCommits >= 5) commitFrequency = 12;
    else if (recentCommits >= 1) commitFrequency = 8;
  } else {
    // Estimate from stars, forks, and activity
    const engagement = repo.stargazers_count + repo.forks_count * 2 + repo.watchers_count;
    if (engagement >= 100) commitFrequency = 18;
    else if (engagement >= 50) commitFrequency = 14;
    else if (engagement >= 20) commitFrequency = 10;
    else if (engagement >= 5) commitFrequency = 6;
    else if (engagement >= 1) commitFrequency = 3;
  }

  // ===== Issue Activity (15 points) =====
  let issueResolution = 0;
  if (issues.length > 0) {
    const closedIssues = issues.filter(i => i.state === 'closed' && i.closed_at);
    if (closedIssues.length > 0) {
      const quickClosed = closedIssues.filter(i => {
        const created = new Date(i.created_at).getTime();
        const closed = new Date(i.closed_at!).getTime();
        return (closed - created) < 7 * 24 * 60 * 60 * 1000;
      });
      const ratio = quickClosed.length / closedIssues.length;
      if (ratio > 0.8) issueResolution = 15;
      else if (ratio > 0.6) issueResolution = 12;
      else if (ratio > 0.4) issueResolution = 8;
      else issueResolution = 4;
    }
  } else {
    // Use open_issues_count as proxy - fewer issues relative to activity = healthier
    if (repo.open_issues_count === 0 && daysSincePush < 90) issueResolution = 12;
    else if (repo.open_issues_count <= 5) issueResolution = 10;
    else if (repo.open_issues_count <= 20) issueResolution = 7;
    else if (repo.open_issues_count <= 50) issueResolution = 4;
    else issueResolution = 2;
  }

  // ===== PR Velocity (15 points) =====
  let prVelocity = 0;
  if (prs.length > 0) {
    const mergedPRs = prs.filter(p => p.merged_at);
    if (mergedPRs.length > 0) {
      const avgDays = mergedPRs.reduce((sum, p) => {
        const created = new Date(p.created_at).getTime();
        const merged = new Date(p.merged_at!).getTime();
        return sum + (merged - created) / (24 * 60 * 60 * 1000);
      }, 0) / mergedPRs.length;
      if (avgDays < 3) prVelocity = 15;
      else if (avgDays < 7) prVelocity = 12;
      else if (avgDays < 14) prVelocity = 8;
      else prVelocity = 4;
    }
  } else {
    // Estimate from forks (more forks = more PR activity likely)
    if (repo.forks_count >= 50) prVelocity = 13;
    else if (repo.forks_count >= 20) prVelocity = 10;
    else if (repo.forks_count >= 5) prVelocity = 7;
    else if (repo.forks_count >= 1) prVelocity = 4;
  }

  // ===== Documentation & Setup (15 points) =====
  let documentation = 0;
  if (repo.description && repo.description.length > 10) documentation += 4;
  else if (repo.description) documentation += 2;
  if (repo.license) documentation += 3;
  if (repo.topics && repo.topics.length >= 3) documentation += 3;
  else if (repo.topics && repo.topics.length > 0) documentation += 1;
  if (repo.has_wiki) documentation += 2;
  if (!repo.archived) documentation += 2;
  if (repo.default_branch === 'main' || repo.default_branch === 'master') documentation += 1;

  // ===== Activity Signal (10 points) =====
  let cicd = 0;
  // Use updated_at vs pushed_at difference as proxy for CI/automation
  const updatedDiff = Math.abs(new Date(repo.updated_at).getTime() - new Date(repo.pushed_at).getTime()) / (24 * 60 * 60 * 1000);
  if (updatedDiff < 1) cicd = 10; // updated same day as push = likely CI
  else if (updatedDiff < 3) cicd = 8;
  else if (updatedDiff < 7) cicd = 5;
  else if (updatedDiff < 30) cicd = 3;

  // Archived penalty
  if (repo.archived) {
    recency = 0;
    commitFrequency = Math.min(commitFrequency, 3);
    cicd = 0;
  }

  const total = Math.min(100, commitFrequency + issueResolution + prVelocity + documentation + cicd + recency);

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
