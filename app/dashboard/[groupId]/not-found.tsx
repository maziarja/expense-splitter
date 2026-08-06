import Link from "next/link";

export default function DashboardGroupNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
      <p className="text-text-secondary">Group not found.</p>
      <Link
        href="/dashboard"
        className="text-xs text-accent underline underline-offset-4"
      >
        Back to your dashboard
      </Link>
    </div>
  );
}
