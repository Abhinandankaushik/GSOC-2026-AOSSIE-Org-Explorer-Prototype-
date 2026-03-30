export default function SkeletonCard() {
  return (
    <div className="bg-surface-card border border-border rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg shimmer" />
        <div className="w-12 h-5 rounded-full shimmer" />
      </div>
      <div className="w-20 h-7 shimmer rounded mb-2" />
      <div className="w-24 h-3 shimmer rounded" />
    </div>
  );
}
