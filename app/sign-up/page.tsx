import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-bg-primary p-8">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-bold text-text-primary">Sign up</h1>
        <p className="mt-2 text-text-secondary">
          Account creation is coming in a later step. For now, explore the app
          with sample data.
        </p>
        <Link
          href="/groups"
          className="mt-4 inline-block text-accent underline underline-offset-4"
        >
          Try as guest instead
        </Link>
        <Link href="/" className="mt-2 block text-sm text-text-tertiary">
          ← Back home
        </Link>
      </div>
    </main>
  );
}
