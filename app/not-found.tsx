import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 bg-bg-primary p-8 text-center">
      <h1 className="text-2xl font-bold text-text-primary">Page not found</h1>
      <p className="text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-2 text-sm text-accent underline underline-offset-4"
      >
        ← Back home
      </Link>
    </main>
  );
}
