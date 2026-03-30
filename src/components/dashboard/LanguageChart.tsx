import { useAppStore } from '@/store/app-store';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219',
  'C++': '#f34b7d', C: '#555555', Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516',
  PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF', Scala: '#c22d40',
  Shell: '#89e051', HTML: '#e34c26', CSS: '#563d7c', Dart: '#00B4AB',
  R: '#198CE7', Jupyter: '#DA5B0B', Vue: '#41b883',
};

export default function LanguageChart() {
  const languages = useAppStore(s => s.languages);
  
  const data = Array.from(languages.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">No language data available</p>;
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <div className="w-40 h-40 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={LANG_COLORS[entry.name] || '#8b5cf6'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'hsl(235, 20%, 8%)',
                border: '1px solid hsl(235, 15%, 18%)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'hsl(220, 20%, 92%)',
              }}
              formatter={(value: number, name: string) => [`${value} repos`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: LANG_COLORS[d.name] || '#8b5cf6' }} />
            <span className="text-foreground flex-1">{d.name}</span>
            <span className="text-muted-foreground font-mono">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
