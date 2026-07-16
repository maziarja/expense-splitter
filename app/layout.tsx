import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Manrope is a variable font (weights 200-800), so no `weight` is needed.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

// IBM Plex Mono ships static weights; load the ones the brand kit actually
// calls for (regular metadata, medium for amounts/emphasis).
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "Expense Splitter",
  description: "Split expenses. Settle up. Stay friends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
