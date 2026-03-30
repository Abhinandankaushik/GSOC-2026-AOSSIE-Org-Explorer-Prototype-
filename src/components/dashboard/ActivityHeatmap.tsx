import { useState, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { GHRepo, GHEvent } from '@/lib/github-client';
import { useAppStore } from '@/store/app-store';

const CELL_SIZE = 14;
const GAP = 3;
const WEEKS = 52;
const DAYS = 7;
const HEADER_HEIGHT = 20;
const DAY_LABEL_WIDTH = 28;

const COLORS = [
  'hsl(235, 15%, 12%)',
  'hsl(263, 50%, 25%)',
  'hsl(263, 60%, 40%)',
  'hsl(263, 65%, 55%)',
  'hsl(263, 70%, 66%)',
];

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  repos: GHRepo[];
  events?: GHEvent[];
}

interface CellData {
  date: Date;
  count: number;
  events: string[];
  activities: string[];
}

export default function ActivityHeatmap({ repos, events: externalEvents }: Props) {
  const storeEvents = useAppStore(s => s.events);
  const events = externalEvents ?? storeEvents;
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; cell: CellData } | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Available years from repo data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    repos.forEach(r => {
      [r.pushed_at, r.created_at, r.updated_at].forEach(d => years.add(new Date(d).getFullYear()));
    });
    events.forEach(e => years.add(new Date(e.created_at).getFullYear()));
    const sorted = Array.from(years).sort((a, b) => b - a);
    if (sorted.length === 0) sorted.push(currentYear);
    return sorted;
  }, [repos, events, currentYear]);

  const { grid, monthLabels } = useMemo(() => {
    const isCurrentYear = selectedYear === currentYear;
    const endDate = isCurrentYear ? new Date() : new Date(selectedYear, 11, 31);
    const grid = new Map<string, CellData>();

    for (let week = 0; week < WEEKS; week++) {
      for (let day = 0; day < DAYS; day++) {
        const daysAgo = (WEEKS - 1 - week) * 7 + (6 - day);
        const date = new Date(endDate);
        date.setDate(date.getDate() - daysAgo);
        date.setHours(0, 0, 0, 0);
        if (date.getFullYear() !== selectedYear && !isCurrentYear) continue;
        const key = `${week}-${day}`;
        grid.set(key, { date, count: 0, events: [], activities: [] });
      }
    }

    const bumpCell = (dateStr: string, label: string, repoName?: string) => {
      const d = new Date(dateStr);
      const daysAgo = Math.floor((endDate.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
      if (daysAgo >= 0 && daysAgo < 365) {
        const week = WEEKS - 1 - Math.floor(daysAgo / 7);
        const day = 6 - (daysAgo % 7);
        if (week >= 0 && week < WEEKS && day >= 0 && day < DAYS) {
          const key = `${week}-${day}`;
          const cell = grid.get(key);
          if (cell) {
            cell.count++;
            if (repoName && !cell.events.includes(repoName)) cell.events.push(repoName);
            cell.activities.push(label);
          }
        }
      }
    };

    repos.forEach(repo => {
      const dateActions: [string, string, string | undefined][] = [
        [repo.pushed_at, `Pushed ${repo.name}`, repo.name],
        [repo.created_at, `Created ${repo.name}`, repo.name],
        [repo.updated_at, `Updated ${repo.name}`, repo.name],
      ];
      dateActions.forEach(([dateStr, activity, repoName]) => bumpCell(dateStr, activity, repoName));
    });

    events.forEach(event => {
      const repoName = event.repo.name.split('/')[1] || event.repo.name;
      const type = event.type.replace('Event', '');
      const action = (event.payload as Record<string, unknown>)?.action as string | undefined;
      const label = `${type}${action ? ` (${action})` : ''} · ${repoName}`;
      bumpCell(event.created_at, label, repoName);
    });

    const monthLabels: { label: string; x: number }[] = [];
    let lastMonth = -1;
    for (let week = 0; week < WEEKS; week++) {
      const cell = grid.get(`${week}-0`);
      if (cell) {
        const month = cell.date.getMonth();
        if (month !== lastMonth) {
          monthLabels.push({ label: MONTH_NAMES[month], x: DAY_LABEL_WIDTH + week * (CELL_SIZE + GAP) });
          lastMonth = month;
        }
      }
    }

    return { grid, monthLabels };
  }, [repos, events, selectedYear, currentYear]);

  const maxVal = Math.max(1, ...Array.from(grid.values()).map(c => c.count));

  const handleCellHover = (e: React.MouseEvent, week: number, day: number) => {
    const cell = grid.get(`${week}-${day}`);
    if (!cell) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, cell });
  };

  const canGoBack = availableYears.includes(selectedYear - 1) || selectedYear > Math.min(...availableYears);
  const canGoForward = selectedYear < currentYear;

  return (
    <div ref={containerRef} className="overflow-x-auto pb-2 relative">
      {/* Year Selector */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setSelectedYear(y => y - 1)}
          disabled={!canGoBack}
          className="p-1 rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex gap-1">
          {availableYears.slice(0, 5).map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                selectedYear === year
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSelectedYear(y => y + 1)}
          disabled={!canGoForward}
          className="p-1 rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <svg
        width={DAY_LABEL_WIDTH + WEEKS * (CELL_SIZE + GAP)}
        height={HEADER_HEIGHT + DAYS * (CELL_SIZE + GAP)}
      >
        {monthLabels.map((m, i) => (
          <text key={i} x={m.x} y={12} fill="hsl(220, 10%, 55%)" fontSize={10} fontFamily="Inter">
            {m.label}
          </text>
        ))}
        {DAY_LABELS.map((label, i) => (
          label && (
            <text key={i} x={0} y={HEADER_HEIGHT + i * (CELL_SIZE + GAP) + CELL_SIZE - 2}
              fill="hsl(220, 10%, 55%)" fontSize={9} fontFamily="Inter">
              {label}
            </text>
          )
        ))}
        {Array.from({ length: WEEKS }, (_, week) =>
          Array.from({ length: DAYS }, (_, day) => {
            const cell = grid.get(`${week}-${day}`);
            if (!cell) return null;
            const level = cell.count === 0 ? 0 : Math.min(4, Math.ceil((cell.count / maxVal) * 4));
            return (
              <rect
                key={`${week}-${day}`}
                x={DAY_LABEL_WIDTH + week * (CELL_SIZE + GAP)}
                y={HEADER_HEIGHT + day * (CELL_SIZE + GAP)}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                fill={COLORS[level]}
                className="transition-all duration-150 hover:stroke-primary hover:stroke-[1.5px] cursor-pointer"
                onMouseEnter={e => handleCellHover(e, week, day)}
                onMouseMove={e => handleCellHover(e, week, day)}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })
        )}
      </svg>

      {tooltip && (
        <div
          className="absolute pointer-events-none z-50 bg-surface-overlay/95 backdrop-blur-md rounded-lg px-3 py-2 border border-border shadow-xl text-xs"
          style={{
            left: Math.min(tooltip.x + 12, (containerRef.current?.clientWidth || 600) - 220),
            top: tooltip.y - 80,
          }}
        >
          <p className="font-medium text-foreground">
            {tooltip.cell.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-muted-foreground mt-0.5">
            {tooltip.cell.count === 0 ? 'No activity' : `${tooltip.cell.count} activit${tooltip.cell.count > 1 ? 'ies' : 'y'}`}
          </p>
          {tooltip.cell.activities.length > 0 && (
            <div className="mt-1.5 space-y-0.5 text-[10px] text-muted-foreground/80 max-h-[100px] overflow-y-auto">
              {tooltip.cell.activities.slice(0, 5).map((act, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-primary">•</span> {act}
                </div>
              ))}
              {tooltip.cell.activities.length > 5 && (
                <div className="text-primary/70">+{tooltip.cell.activities.length - 5} more</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
        <span>Less</span>
        {COLORS.map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
