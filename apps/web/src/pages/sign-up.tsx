"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { ContinueWithGoogle } from "@/components/auth/ContinueWithGoogle";
import { Button } from "@/components/ui/Button";
import { VETPLY_ACCESS_TOKEN_KEY } from "@/utils/vetply-api/storage";
import { createAccount } from "@/utils/vetply-api/user-auth";
import { isVetplyBadRequestError } from "@/utils/vetply-api/vetply-bad-request-error";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createAccount({ email, password });
      localStorage.setItem(VETPLY_ACCESS_TOKEN_KEY, res.accessToken);
      await router.push("/app");
    } catch (err) {
      if (isVetplyBadRequestError(err)) {
        if (err.failReason === "ACCOUNT_EXISTS_VETPLY") {
          setError("An account with this email already exists.");
        } else {
          setError(
            "This email is registered with Google. Sign in with Google instead.",
          );
        }
        return;
      }
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-900 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <Image
            src="/logo.svg"
            alt="Vetply"
            width={360}
            height={90}
            className="h-24 w-auto"
            unoptimized
            priority
          />
        </Link>
        <h2 className="mt-3 text-center text-2xl/9 font-bold tracking-tight text-white">
          Create your account
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-sm/6 text-gray-400">
          You can start your 1-month free trial right away and choose a
          subscription plan later, when the trial ends.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-gray-800/50 px-6 py-12 outline -outline-offset-1 outline-white/10 sm:rounded-lg sm:px-12">
          {error ? (
            <p
              className="mb-6 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm/6 font-medium text-white"
              >
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-500 sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm/6 font-medium text-white"
              >
                Password
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-500 sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm/6 font-medium text-white"
              >
                Confirm password
              </label>
              <div className="mt-2">
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-500 sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <Button type="submit" fullWidth disabled={submitting}>
                {submitting ? "Creating account…" : "Create account"}
              </Button>
            </div>
          </form>

          <ContinueWithGoogle />
        </div>

        <p className="mt-10 text-center text-sm/6 text-gray-400">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-primary-100 hover:text-primary-200"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
