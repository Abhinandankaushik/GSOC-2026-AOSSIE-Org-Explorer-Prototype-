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
      whileHover={{ y: -6, scale: 1.03, transition: { duration: 0.2 } }}
      className="bg-gradient-to-br from-surface-card to-surface-card/50 border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-[0_20px_40px_hsl(263_70%_66%/0.15)] transition-all group cursor-default card-hover"
    >
      <div className="flex items-start justify-between mb-3">
        <motion.div
          whileHover={{ rotate: [0, -12, 12, 0], scale: 1.1 }}
          transition={{ duration: 0.4 }}
          className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity shadow-lg glow-primary"
        >
          <Icon className="w-5 h-5 text-primary-foreground" />
        </motion.div>
        {trend !== undefined && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`text-xs font-mono px-2.5 py-1 rounded-full font-semibold ${
              trend >= 0 ? 'bg-success/15 text-success border border-success/30' : 'bg-destructive/15 text-destructive border border-destructive/30'
            }`}>
            {trend >= 0 ? '↑ ' : '↓ '}{Math.abs(trend)}%
          </motion.span>
        )}
      </div>
      <p className="text-2xl font-bold font-mono bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
        {displayValue.toLocaleString()}{suffix}
      </p>
      <p className="text-xs text-muted-foreground mt-2 font-medium">{title}</p>
    </motion.div>
  );
}
