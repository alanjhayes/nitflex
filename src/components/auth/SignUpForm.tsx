"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@/lib/validations";
import { registerUser } from "@/app/actions/auth";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  async function onSubmit(data: SignUpInput) {
    setLoading(true);
    setError(null);
    try {
      await registerUser(data);
      await signIn("credentials", {
        email: data.email,
        password: data.password,
        callbackUrl: "/home",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-black/75 px-16 py-12 rounded-md">
      <h1 className="text-3xl font-bold mb-8">Sign Up</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input
            {...register("name")}
            type="text"
            placeholder="Full Name"
            className="w-full bg-[#333] rounded px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <input
            {...register("email")}
            type="email"
            placeholder="Email"
            className="w-full bg-[#333] rounded px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <input
            {...register("password")}
            type="password"
            placeholder="Password"
            className="w-full bg-[#333] rounded px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#e50914] hover:bg-[#c40712] text-white py-4 rounded font-semibold transition disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-[#333]" />
        <span className="text-[#737373] text-sm">or</span>
        <div className="flex-1 h-px bg-[#333]" />
      </div>
      <button
        onClick={() => signIn("github", { callbackUrl: "/home" })}
        className="w-full mt-4 bg-[#333] hover:bg-[#444] text-white py-4 rounded font-semibold transition flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
        Continue with GitHub
      </button>
      <p className="text-[#737373] mt-6 text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-white hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
