import { useState, useMemo, useRef } from 'react';
import type { GHEvent, GHRepo } from '@/lib/github-client';
import { useAppStore } from '@/store/app-store';

const CELL_SIZE = 14;
const GAP = 3;
const DAYS = 7;
const HEADER_HEIGHT = 20;
const DAY_LABEL_WIDTH = 28;
const DAY_MS = 24 * 60 * 60 * 1000;

const COLORS = [
  'hsl(235, 15%, 12%)',
  'hsl(263, 50%, 25%)',
  'hsl(263, 60%, 40%)',
  'hsl(263, 65%, 55%)',
  'hsl(263, 70%, 66%)',
];

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface CellData {
  date: Date;
  count: number;
  activities: string[];
}

interface Props {
  repos: GHRepo[];
}

export default function ActivityHeatmap({ repos }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; cell: CellData } | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const events = useAppStore(s => s.events);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    years.add(currentYear - 1);
    years.add(currentYear - 2);
    repos.forEach(r => {
      [r.pushed_at, r.created_at, r.updated_at].forEach(d => {
        years.add(new Date(d).getFullYear());
      });
    });
    events.forEach(e => years.add(new Date(e.created_at).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [repos, events, currentYear]);

  const { grid, monthLabels, weeks } = useMemo(() => {
    const startDate = new Date(selectedYear, 0, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedYear, 11, 31);
    endDate.setHours(0, 0, 0, 0);

    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1;
    const weeks = Math.max(1, Math.ceil(totalDays / 7));

    const grid = new Map<string, CellData>();

    for (let week = 0; week < weeks; week++) {
      for (let day = 0; day < DAYS; day++) {
        const date = new Date(startDate.getTime() + (week * 7 + day) * DAY_MS);
        date.setHours(0, 0, 0, 0);
        const key = `${week}-${day}`;
        grid.set(key, { date, count: 0, activities: [] });
      }
    }

    // Helper to add activity to a date
    const addActivity = (dateStr: string, activity: string) => {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      if (d.getFullYear() !== selectedYear) return;
      if (d < startDate || d > endDate) return;
      const daysFromStart = Math.floor((d.getTime() - startDate.getTime()) / DAY_MS);
      const week = Math.floor(daysFromStart / 7);
      const day = (d.getDay() + 6) % 7; // Monday-first layout
      const cell = grid.get(`${week}-${day}`);
      if (cell) {
        cell.count++;
        cell.activities.push(activity);
      }
    };

    // Add events (primary source of real activity)
    events.forEach(event => {
      const repoName = event.repo.name.split('/')[1] || event.repo.name;
      const eventType = event.type.replace('Event', '');
      const actor = event.actor.login;
      addActivity(event.created_at, `${actor} ${eventType} in ${repoName}`);
    });

    // Add repo push/create/update dates
    repos.forEach(repo => {
      addActivity(repo.pushed_at, `Push to ${repo.name}`);
      addActivity(repo.created_at, `Created ${repo.name}`);
      // Only add updated_at if different day from pushed_at
      const pushDay = new Date(repo.pushed_at).toDateString();
      const updateDay = new Date(repo.updated_at).toDateString();
      if (pushDay !== updateDay) {
        addActivity(repo.updated_at, `Updated ${repo.name}`);
      }
    });

    // Month labels
    const monthLabels: { label: string; x: number }[] = [];
    let lastMonth = -1;
    for (let week = 0; week < weeks; week++) {
      const cell = grid.get(`${week}-0`);
      if (cell) {
        const month = cell.date.getMonth();
        if (month !== lastMonth) {
          monthLabels.push({ label: MONTH_NAMES[month], x: DAY_LABEL_WIDTH + week * (CELL_SIZE + GAP) });
          lastMonth = month;
        }
      }
    }

    return { grid, monthLabels, weeks };
  }, [repos, events, selectedYear, currentYear]);

  const maxVal = Math.max(1, ...Array.from(grid.values()).map(c => c.count));

  const handleCellHover = (e: React.MouseEvent, week: number, day: number) => {
    const cell = grid.get(`${week}-${day}`);
    if (!cell) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, cell });
  };

  return (
    <div ref={containerRef} className="overflow-x-auto pb-2 relative">
      {/* Year Selector */}
      <div className="mb-4">
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="px-3 py-1 rounded-md bg-surface-card border border-border text-sm text-foreground"
        >
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <svg
        width={DAY_LABEL_WIDTH + weeks * (CELL_SIZE + GAP)}
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
        {Array.from({ length: weeks }, (_, week) =>
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
          className="absolute pointer-events-none z-50 bg-popover/95 backdrop-blur-md rounded-lg px-3 py-2 border border-border shadow-xl text-xs"
          style={{
            left: Math.min(tooltip.x + 12, (containerRef.current?.clientWidth || 600) - 220),
            top: tooltip.y - 80,
          }}
        >
          <p className="font-medium text-popover-foreground">
            {tooltip.cell.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-muted-foreground mt-0.5">
            {tooltip.cell.count === 0 ? 'No activity' : `${tooltip.cell.count} activit${tooltip.cell.count > 1 ? 'ies' : 'y'}`}
          </p>
          {tooltip.cell.activities.length > 0 && (
            <div className="mt-1.5 space-y-0.5 text-[10px] text-muted-foreground/80 max-h-[120px] overflow-y-auto">
              {tooltip.cell.activities.slice(0, 8).map((act, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-primary">•</span> {act}
                </div>
              ))}
              {tooltip.cell.activities.length > 8 && (
                <div className="text-primary/70">+{tooltip.cell.activities.length - 8} more</div>
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
