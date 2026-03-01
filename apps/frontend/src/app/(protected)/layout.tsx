"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Redirect to login if no token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-base-200">
      {/* Sidebar */}
      <aside className="w-64 bg-base-100 shadow-md p-6 space-y-6">
        <h1 className="text-xl font-bold">
          Mortgage AI
        </h1>

        <nav className="flex flex-col space-y-3">
          <Link
            href="/dashboard"
            className="btn btn-ghost justify-start"
          >
            Dashboard
          </Link>

          <Link
            href="/documents"
            className="btn btn-ghost justify-start"
          >
            My Documents
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="btn btn-error mt-6"
        >
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        {children}
      </main>
    </div>
  );
}