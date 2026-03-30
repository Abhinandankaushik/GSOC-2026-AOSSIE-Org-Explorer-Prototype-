import { gradeColor, type HealthGrade } from '@/lib/health-score';

interface HealthBadgeProps {
  grade: HealthGrade;
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function HealthBadge({ grade, score, size = 'sm' }: HealthBadgeProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
  };

  const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 3 : 4;
  const radius = size === 'sm' ? 12 : size === 'md' ? 20 : 28;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;

  const colorMap: Record<HealthGrade, string> = {
    'Excellent': '#22c55e',
    'Good': '#3b82f6',
    'Needs Attention': '#f59e0b',
    'At Risk': '#ef4444',
    'Stale': '#64748b',
  };

  return (
    <div className="relative inline-flex items-center justify-center" title={`${grade} (${score}/100)`}>
      <svg className={sizeClasses[size]} viewBox={`0 0 ${(radius + strokeWidth) * 2} ${(radius + strokeWidth) * 2}`}>
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke={colorMap[grade]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          strokeLinecap="round"
          transform={`rotate(-90 ${radius + strokeWidth} ${radius + strokeWidth})`}
          className="transition-all duration-1000"
        />
      </svg>
      <span className={`absolute font-mono font-semibold ${gradeColor(grade)}`}>
        {score}
      </span>
    </div>
  );
}
