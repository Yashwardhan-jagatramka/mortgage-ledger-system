"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    try {
      setLoading(true);
      setError("");

      await axios.post("http://localhost:4000/auth/register", {
        email,
        password,
      });

      // Redirect to login after success
      router.push("/login");
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          "Signup failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl p-8 space-y-6">
        <h2 className="text-2xl font-bold text-center">
          Create Account
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
          onClick={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            "Sign Up"
          )}
        </button>

        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link
            href="/login"
            className="link link-primary"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}