"use client"
import Link from "next/link"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Header } from "@/components/Header"
import PublicGuard from "@/components/PublicGuard"
import { useAuth } from "@/components/AuthProvider"
import { User, Building2, Mail, Lock, Loader2, AlertCircle } from "lucide-react"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [tenantName, setTenantName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signup } = useAuth()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signup(name, email, password, tenantName || name || "my-tenant")
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Signup failed. Please try again."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicGuard>
      <div className="relative flex min-h-screen flex-col">
        <Header />

        <main className="flex flex-1 items-center justify-center p-6 py-12">
          <div className="w-full max-w-md">
            <Card className="glass-panel overflow-hidden border-border/50 shadow-xl">
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-3xl font-bold tracking-tight">
                  Create your account
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Start booking appointments with AI in minutes
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Premium Error Banner */}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tenantName">Business name</Label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="tenantName"
                        placeholder="Acme Inc. (optional)"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave blank to use your name as the business name.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        placeholder="••••••••"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="shadow-glow w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="justify-center border-t border-border/50 bg-muted/20 py-4">
                <div className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-primary hover:underline"
                  >
                    Log in
                  </Link>
                </div>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </PublicGuard>
  )
}
