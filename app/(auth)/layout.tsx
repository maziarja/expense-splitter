import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main id="main-content" className="flex flex-1 flex-col bg-bg-primary">
      <header className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
        <Link href="/" className="text-sm font-bold text-text-primary">
          Expense Splitter
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
