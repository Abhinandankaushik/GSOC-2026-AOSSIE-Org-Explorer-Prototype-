import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: number;
  suffix?: string;
  delay?: number;
}

export default function KPICard({ title, value, icon: Icon, trend, suffix = '', delay = 0 }: KPICardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay / 1000, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
      className="bg-surface-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-[0_0_20px_hsl(263_70%_66%/0.08)] transition-all group cursor-default"
    >
      <div className="flex items-start justify-between mb-3">
        <motion.div
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.4 }}
          className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"
        >
          <Icon className="w-5 h-5 text-primary-foreground" />
        </motion.div>
        {trend !== undefined && (
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
            trend >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-foreground font-mono">
        {displayValue.toLocaleString()}{suffix}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{title}</p>
    </motion.div>
  );
}
