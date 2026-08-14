export default function PlacementsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-48 bg-muted/50 rounded-lg" />
      <div className="space-y-4">
        <div key="pl-sk-1" className="h-16 bg-muted/30 rounded-lg" />
        <div key="pl-sk-2" className="h-16 bg-muted/30 rounded-lg" />
        <div key="pl-sk-3" className="h-16 bg-muted/30 rounded-lg" />
        <div key="pl-sk-4" className="h-16 bg-muted/30 rounded-lg" />
        <div key="pl-sk-5" className="h-16 bg-muted/30 rounded-lg" />
      </div>
    </div>
  );
}