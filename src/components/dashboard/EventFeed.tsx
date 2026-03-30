import { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { GitPullRequest, AlertCircle, Star, GitFork, Play, ExternalLink, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { GHEvent } from '@/lib/github-client';

const eventIcons: Record<string, typeof Star> = {
  PushEvent: Play,
  PullRequestEvent: GitPullRequest,
  IssuesEvent: AlertCircle,
  WatchEvent: Star,
  ForkEvent: GitFork,
};

const eventLabels: Record<string, string> = {
  PushEvent: 'pushed to',
  PullRequestEvent: 'opened PR in',
  IssuesEvent: 'opened issue in',
  WatchEvent: 'starred',
  ForkEvent: 'forked',
  CreateEvent: 'created',
  DeleteEvent: 'deleted',
  ReleaseEvent: 'released in',
};

function getEventDetails(event: GHEvent) {
  const payload = event.payload || {};
  const repoName = event.repo.name;
  const ghBase = `https://github.com/${repoName}`;

  switch (event.type) {
    case 'PushEvent': {
      const commits = (payload.commits as { sha: string; message: string }[]) || [];
      return {
        title: `Pushed ${commits.length} commit${commits.length !== 1 ? 's' : ''}`,
        details: commits.slice(0, 5).map(c => c.message),
        link: commits.length > 0 ? `${ghBase}/commit/${commits[0].sha}` : ghBase,
      };
    }
    case 'PullRequestEvent': {
      const pr = payload.pull_request as { title?: string; html_url?: string; number?: number; state?: string } | undefined;
      return {
        title: `PR #${pr?.number || '?'}: ${pr?.title || 'Pull Request'}`,
        details: [`State: ${pr?.state || payload.action || 'unknown'}`],
        link: pr?.html_url || ghBase,
      };
    }
    case 'IssuesEvent': {
      const issue = payload.issue as { title?: string; html_url?: string; number?: number; state?: string } | undefined;
      return {
        title: `Issue #${issue?.number || '?'}: ${issue?.title || 'Issue'}`,
        details: [`Action: ${(payload.action as string) || 'unknown'}`],
        link: issue?.html_url || ghBase,
      };
    }
    case 'ForkEvent': {
      const forkee = payload.forkee as { html_url?: string; full_name?: string } | undefined;
      return {
        title: `Forked to ${forkee?.full_name || 'unknown'}`,
        details: [],
        link: forkee?.html_url || ghBase,
      };
    }
    case 'WatchEvent':
      return { title: `Starred ${repoName}`, details: [], link: ghBase };
    case 'CreateEvent':
      return {
        title: `Created ${(payload.ref_type as string) || 'resource'} ${(payload.ref as string) || ''}`.trim(),
        details: payload.description ? [payload.description as string] : [],
        link: ghBase,
      };
    case 'ReleaseEvent': {
      const rel = payload.release as { tag_name?: string; html_url?: string; name?: string } | undefined;
      return {
        title: `Release ${rel?.tag_name || rel?.name || ''}`,
        details: [],
        link: rel?.html_url || ghBase,
      };
    }
    default:
      return {
        title: event.type.replace('Event', ''),
        details: [],
        link: ghBase,
      };
  }
}

export default function EventFeed() {
  const events = useAppStore(s => s.events);
  const [selectedEvent, setSelectedEvent] = useState<GHEvent | null>(null);

  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">No recent events</p>;
  }

  const selected = selectedEvent ? getEventDetails(selectedEvent) : null;

  return (
    <div className="relative">
      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
        {events.slice(0, 20).map(event => {
          const Icon = eventIcons[event.type] || Play;
          const label = eventLabels[event.type] || event.type.replace('Event', '').toLowerCase();
          const repoName = event.repo.name.split('/')[1] || event.repo.name;

          return (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer group"
            >
              <img src={event.actor.avatar_url} alt="" className="w-6 h-6 rounded-full mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground">
                  <span className="font-medium">{event.actor.login}</span>{' '}
                  <span className="text-muted-foreground">{label}</span>{' '}
                  <span className="font-mono text-primary">{repoName}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                </p>
              </div>
              <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
            </div>
          );
        })}
      </div>

      {/* Event Detail Popup */}
      {selectedEvent && selected && (
        <div className="absolute inset-0 z-50 bg-surface-overlay/98 backdrop-blur-md rounded-lg border border-border p-4 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <img src={selectedEvent.actor.avatar_url} alt="" className="w-8 h-8 rounded-full" />
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedEvent.actor.login}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(selectedEvent.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <button onClick={() => setSelectedEvent(null)} className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto">
            <p className="text-xs font-medium text-foreground">{selected.title}</p>
            <p className="text-[10px] text-muted-foreground">
              Repository: <span className="font-mono text-primary">{selectedEvent.repo.name}</span>
            </p>
            {selected.details.length > 0 && (
              <div className="space-y-1 mt-2">
                {selected.details.map((d, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground bg-accent/50 rounded px-2 py-1 truncate">
                    {d}
                  </p>
                ))}
              </div>
            )}
          </div>

          <a
            href={selected.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View on GitHub
          </a>
        </div>
      )}
    </div>
  );
}
