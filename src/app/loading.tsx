export default function Loading() {
  return (
    <div aria-live="polite" className="route-progress" role="status">
      <span className="route-progress-bar" />
      <span className="sr-only">Loading the next view…</span>
    </div>
  );
}
