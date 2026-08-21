export default function Loading() {
  return (
    <main aria-busy="true" className="loading-state" role="status">
      <span className="loading-mark" />
      <p>Loading the isolated marketplace workspace…</p>
    </main>
  );
}
