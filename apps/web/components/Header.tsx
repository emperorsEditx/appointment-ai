"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CalendarDays,
  ChevronRight,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookText,
  Settings,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useAuth } from "./AuthProvider"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/logs", label: "Logs", icon: NotebookText },
  { href: "/settings", label: "Settings", icon: Settings },
]

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  appointments: "Appointments",
  logs: "Logs",
  settings: "Settings",
}

export function AppTopbar({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const initialSegments = pathname.split("/").filter(Boolean)
  const crumbs = initialSegments.map((segment, index) => {
    const href = `/${initialSegments.slice(0, index + 1).join("/")}`
    const label = labelMap[segment] ?? segment
    return { href, label }
  })

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl"
        aria-label={title}
      >
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-sm text-muted-foreground">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 md:hidden"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                }
              />
              <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
                <SheetHeader className="border-b border-border/60 px-4 py-4 text-left">
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription>
                    Move between your workspace pages.
                  </SheetDescription>
                </SheetHeader>

                <nav className="flex flex-col gap-2 p-4">
                  {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive =
                      pathname === href ||
                      (href !== "/dashboard" && pathname.startsWith(href))

                    return (
                      <SheetClose
                        key={href}
                        render={
                          <Button
                            type="button"
                            variant={isActive ? "default" : "outline"}
                            className={[
                              "justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                              !isActive && "border-border/60 bg-muted/40 text-muted-foreground",
                            ].join(" ")}
                            onClick={() => router.push(href)}
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                          </Button>
                        }
                      />
                    )
                  })}

                  <SheetClose
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        className="mt-2 justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground"
                        onClick={logout}
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </Button>
                    }
                  />
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/dashboard" className="flex shrink-0 items-center gap-1.5 hover:text-foreground">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
              {crumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex min-w-0 items-center gap-1 truncate">
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <Link
                    href={crumb.href}
                    className={[
                      "truncate text-xs sm:text-sm",
                      index === crumbs.length - 1
                        ? "font-medium text-foreground"
                        : "hover:text-foreground",
                    ].join(" ")}
                  >
                    {crumb.label}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {subtitle ? (
              <div className="hidden rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground md:block">
                {subtitle}
              </div>
            ) : null}

            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-2 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                {initials || "U"}
              </div>
              <div className="hidden text-left text-sm md:block">
                <div className="font-medium leading-none">{user?.name ?? "User"}</div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

export function Header() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-border/60 bg-background/80 backdrop-blur-xl md:flex">
      <div className="flex h-full w-full flex-col">
        <div className="border-b border-border/60 p-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Workspace</div>
              <div className="text-base font-semibold">Appointment AI</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-2 p-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href))

            return (
              <Link
                key={href}
                href={href}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                {initials || "U"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{user.name}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
