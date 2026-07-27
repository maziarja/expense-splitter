import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex flex-1 items-center justify-center bg-bg-primary p-8">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-4 inline-block text-xs text-text-tertiary">
          ← Back home
        </Link>
        {children}
      </div>
    </main>
  );
}
