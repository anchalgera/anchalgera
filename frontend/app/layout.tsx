import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reflective Journaling Coach",
  description: "Guided 5-minute journaling sessions with AI prompts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-10">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Reflective Journaling Coach
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/" className="hover:text-indigo-300 transition">
                Home
              </Link>
              <Link href="/history" className="hover:text-indigo-300 transition">
                Journal History
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto flex max-w-4xl flex-1 flex-col px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
