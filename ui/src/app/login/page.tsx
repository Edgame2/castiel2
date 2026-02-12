/**
 * Login page — shadcn form; calls POST /api/auth/login via gateway.
 * On success, cookies are set by auth service and user is redirected to /dashboard.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { apiFetch, GENERIC_ERROR_MESSAGE } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaSessionId, setMfaSessionId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
        skip401Redirect: true,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 202 && data?.requiresMfa && data?.mfaSessionId) {
        setMfaSessionId(data.mfaSessionId);
        setMfaCode("");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const msg = data?.error || data?.message || `HTTP ${res.status}`;
        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        return;
      }
      // Full page redirect so the browser sends the newly set cookies on the next request (client nav can race with cookie commit)
      window.location.href = "/dashboard";
      return;
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
        setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaSessionId) return;
    const code = mfaCode.replace(/\s/g, "").toUpperCase();
    if (code.length < 6) {
      setError(
        "Enter your 6-digit app code or 8-character backup code."
      );
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login/complete-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaSessionId, code }),
        skip401Redirect: true,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data?.error as string) || "Invalid or expired code. Try again."
        );
        return;
      }
      window.location.href = "/dashboard";
      return;
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  const showMfaStep = !!mfaSessionId;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {showMfaStep ? "Two-factor authentication" : "Sign in"}
          </CardTitle>
          <CardDescription>
            {showMfaStep
              ? "Enter the code from your authenticator app or a backup code."
              : "Enter your credentials to access your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showMfaStep ? (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3 border border-destructive/20">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Authentication code</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(e) =>
                    setMfaCode(e.target.value.replace(/\s/g, "").toUpperCase())
                  }
                  placeholder="6-digit or 8-character backup code"
                  className="font-mono tracking-wider"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Verifying…" : "Continue"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMfaSessionId(null);
                    setMfaCode("");
                    setError(null);
                  }}
                  className="w-full"
                >
                  Use different account
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3 border border-destructive/20">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="login-email">Email <span className="text-destructive" aria-hidden="true">*</span></Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password <span className="text-destructive" aria-hidden="true">*</span></Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="login-remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked === true)
                  }
                />
                <Label
                  htmlFor="login-remember"
                  className="text-sm font-normal cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}
        </CardContent>
        {!showMfaStep && (
          <CardFooter className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <Link
              href="/forgot-password"
              className="underline hover:no-underline hover:text-foreground"
            >
              Forgot password?
            </Link>
            <Link
              href="/register"
              className="underline hover:no-underline hover:text-foreground"
            >
              Create account
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
