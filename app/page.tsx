export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-bg-primary p-8">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-md">
        <p className="text-sm text-text-tertiary">Trip to Japan</p>
        <h1 className="mt-1 text-lg font-bold text-text-primary">
          Group balance
        </h1>

        <div className="mt-6 flex items-center justify-between rounded-md bg-owed-subtle px-4 py-3">
          <span className="text-sm text-text-secondary">Jordan owes you</span>
          <span className="font-mono text-xl font-medium text-owed tabular-nums">
            $22.50
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-md bg-owe-subtle px-4 py-3">
          <span className="text-sm text-text-secondary">You owe Alex</span>
          <span className="font-mono text-xl font-medium text-owe tabular-nums">
            $45.00
          </span>
        </div>

        <button className="mt-6 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover">
          Settle up
        </button>
      </div>
    </div>
  );
}
