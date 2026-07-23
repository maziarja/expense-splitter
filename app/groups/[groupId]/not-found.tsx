import Link from "next/link";

export default function GroupNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
      <p className="text-text-secondary">Group not found.</p>
      <Link
        href="/groups"
        className="text-sm text-accent underline underline-offset-4"
      >
        Back to your groups
      </Link>
    </main>
  );
}
