export function MaterialSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 animate-pulse">
      <div className="aspect-[4/3] rounded-xl mb-4 bg-muted/50" />
      <div className="h-3 w-1/3 bg-muted/50 rounded mb-2" />
      <div className="h-4 w-3/4 bg-muted/50 rounded mb-1" />
      <div className="h-3 w-1/2 bg-muted/50 rounded" />
    </div>
  );
}
