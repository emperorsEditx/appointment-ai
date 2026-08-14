"use client"
import { useTheme } from "next-themes"
import { AppTopbar, Header } from "@/components/Header"
import AuthGuard from "@/components/AuthGuard"
import { useAuth } from "@/components/AuthProvider"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Sun,
  Moon,
  Monitor,
  User,
  Mail,
  ShieldCheck,
  Loader2,
} from "lucide-react"

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  const mounted = theme !== undefined

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ]

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-muted/20">
        <Header />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar title="Settings" subtitle="Profile" />

          <main className="flex-1 px-4 py-6 md:px-6">
            <div className="mx-auto w-full max-w-5xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage your account details and application appearance.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                {/* Profile Information Card */}
                <Card className="glass-panel p-6 shadow-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                  </div>

                  {!user ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[...Array(3)].map((_, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4"
                        >
                          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted"></div>
                          <div className="space-y-2">
                            <div className="h-3 w-20 animate-pulse rounded bg-muted"></div>
                            <div className="h-4 w-28 animate-pulse rounded bg-muted"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs tracking-wide text-muted-foreground uppercase">
                            Full Name
                          </div>
                          <div className="truncate text-sm font-medium text-foreground">
                            {user.name ?? "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                          <Mail className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs tracking-wide text-muted-foreground uppercase">
                            Email Address
                          </div>
                          <div className="truncate text-sm font-medium text-foreground">
                            {user.email ?? "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40 sm:col-span-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs tracking-wide text-muted-foreground uppercase">
                            Account Role
                          </div>
                          <div className="text-sm font-medium text-foreground capitalize">
                            {user.role?.toLowerCase() ?? "Member"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                <Card className="glass-panel p-6 shadow-sm">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold">Appearance</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Customize how Appointment AI looks on your device.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map((option) => {
                      const isActive = mounted && theme === option.value

                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant="outline"
                          onClick={() => setTheme(option.value)}
                          className={`flex h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all ${
                            isActive
                              ? "shadow-glow border-primary bg-primary/5 text-primary"
                              : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/50"
                          }`}
                        >
                          <option.icon className="h-5 w-5" />
                          <span className="text-xs font-medium">{option.label}</span>
                        </Button>
                      )
                    })}
                  </div>

                  {!mounted && (
                    <div className="mt-4 flex justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
