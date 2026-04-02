"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { ContinueWithGoogle } from "@/components/auth/ContinueWithGoogle";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { VETPLY_ACCESS_TOKEN_KEY } from "@/utils/vetply-api/storage";
import { vetplyApiUnexpectedErrorToastShown } from "@/utils/vetply-api/http-client";
import { routes } from "@/constants/routes";
import { login } from "@/utils/vetply-api/user-auth";
import { isAxiosError } from "axios";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await login({ email, password });
      localStorage.setItem(VETPLY_ACCESS_TOKEN_KEY, res.accessToken);
      await router.push(routes.app);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setError("Invalid email or password");
        return;
      }
      if (isAxiosError(err) && err.response?.status === 400) {
        setError("Please check your email and password.");
        return;
      }
      if (vetplyApiUnexpectedErrorToastShown(err)) {
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
        <Link href={routes.home} className="flex justify-center">
          <img
            src="/logo.svg"
            alt="Vetply"
            width={360}
            height={90}
            className="h-24 w-auto"
            fetchPriority="high"
            decoding="async"
          />
        </Link>
        <h2 className="mt-3 text-center text-2xl/9 font-bold tracking-tight text-white">
          Sign in to your account
        </h2>
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
                <TextInput
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
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
                <TextInput
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <div className="flex h-6 shrink-0 items-center">
                  <div className="group grid size-4 grid-cols-1">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="col-start-1 row-start-1 appearance-none rounded-sm border border-white/10 bg-white/5 checked:border-primary-500 checked:bg-primary-500 indeterminate:border-primary-500 indeterminate:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
                    />
                    <svg
                      fill="none"
                      viewBox="0 0 14 14"
                      className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-white/25"
                      aria-hidden
                    >
                      <path
                        d="M3 8L6 11L11 3.5"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-0 group-has-checked:opacity-100"
                      />
                      <path
                        d="M3 7H11"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-0 group-has-indeterminate:opacity-100"
                      />
                    </svg>
                  </div>
                </div>
                <label
                  htmlFor="remember-me"
                  className="block text-sm/6 text-white"
                >
                  Remember me
                </label>
              </div>

              <div className="text-sm/6">
                <a
                  href="#"
                  className="font-semibold text-primary-100 hover:text-primary-200"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <Button type="submit" fullWidth disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </div>
          </form>

          <ContinueWithGoogle />
        </div>

        <p className="mt-10 text-center text-sm/6 text-gray-400">
          Not a member?{" "}
          <Link
            href={routes.signUp}
            className="font-semibold text-primary-100 hover:text-primary-200"
          >
            Start your 1 month free trial
          </Link>
        </p>
      </div>
    </div>
  );
}
