"use client";

import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiClient, AUTH_EXPIRED_EVENT, AUTH_TOKEN_KEY } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";

const AuthContext = createContext<{ signOut: () => Promise<void> } | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthGate");
  return context;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const isSetupRoute = pathname === "/setup" || pathname === "/onboarding";

  useEffect(() => {
    let ignore = false;
    const expire = () => setAuthenticated(false);
    window.addEventListener(AUTH_EXPIRED_EVENT, expire);

    async function check() {
      try {
        const status = await apiClient<{ installed: boolean }>("/installation/status");
        if (ignore) return;
        setInstalled(status.installed);
        if (!status.installed) {
          if (!isSetupRoute) router.replace("/setup");
        } else if (sessionStorage.getItem(AUTH_TOKEN_KEY)) {
          const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
          try {
            await apiClient("/auth/user");
            if (!ignore && sessionStorage.getItem(AUTH_TOKEN_KEY) === token) setAuthenticated(true);
          } catch (err) {
            if (sessionStorage.getItem(AUTH_TOKEN_KEY)) throw err;
          }
        }
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Unable to connect to the store.");
      } finally {
        if (!ignore) setChecking(false);
      }
    }
    check();
    return () => {
      ignore = true;
      window.removeEventListener(AUTH_EXPIRED_EVENT, expire);
    };
  }, [isSetupRoute, router]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await apiClient<{ token: string }>("/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });
      sessionStorage.setItem(AUTH_TOKEN_KEY, result.token);
      setPassword("");
      setAuthenticated(true);
      if (isSetupRoute) router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await apiClient("/auth/logout", { method: "POST" });
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthenticated(false);
  }

  if ((!checking && installed === false && isSetupRoute) || authenticated) {
    return <AuthContext.Provider value={{ signOut }}>{children}</AuthContext.Provider>;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-lg font-bold">Administrator sign-in</h1>
          <CardDescription>Use the administrator account created during store setup.</CardDescription>
        </CardHeader>
        <CardContent>
          {checking || installed === false ? <p role="status">Loading store…</p> : (
            <form onSubmit={signIn} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="admin-email" className="text-sm">Email</label>
                <Input id="admin-email" type="email" autoComplete="username" required maxLength={150}
                  value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-1">
                <label htmlFor="admin-password" className="text-sm">Password</label>
                <Input id="admin-password" type="password" autoComplete="current-password" required
                  value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              <Button type="submit" disabled={busy || installed === null} className="w-full">
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
          {installed === null && !checking && (
            <Button className="mt-3" onClick={() => window.location.reload()}>Retry connection</Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
