export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex flex-1 items-center justify-center bg-bg-primary p-8">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
