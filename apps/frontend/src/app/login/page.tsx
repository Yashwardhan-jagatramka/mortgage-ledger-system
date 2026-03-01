"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        { email, password }
      );

      localStorage.setItem("token", res.data.token);

      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          "Invalid credentials"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl p-8 space-y-6">
        <h2 className="text-2xl font-bold text-center">
          Login
        </h2>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          className="input input-bordered w-full"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <input
          type="password"
          placeholder="Password"
          className="input input-bordered w-full"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button
          className="btn btn-primary w-full"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            "Login"
          )}
        </button>

        <div className="text-center text-sm">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="link link-primary"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}