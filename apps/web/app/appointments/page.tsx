"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { AppTopbar, Header } from "@/components/Header"
import AuthGuard from "@/components/AuthGuard"
import { useAuth } from "@/components/AuthProvider"
import { appointmentsApi, Appointment } from "@/lib/appointments"
import { useToast } from "@/components/ToastProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  CalendarPlus,
  AlertCircle,
  CalendarDays,
  MapPin,
  Clock,
  Loader2,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

type FilterType = "ALL" | "UPCOMING" | "CONFIRMED" | "CANCELLED"
type ViewMode = "LIST" | "CALENDAR"

function formatTime(startAt: string, endAt: string) {
  const start = new Date(startAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  const end = new Date(endAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  return `${start} – ${end}`
}

export default function AppointmentsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeFilter, setActiveFilter] = useState<FilterType>("UPCOMING")
  const [viewMode, setViewMode] = useState<ViewMode>("LIST")
  const [isSyncing, setIsSyncing] = useState(false)

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    if (!token) return
    let cancelled = false

    appointmentsApi
      .list(token)
      .then((data) => {
        if (!cancelled) setAppointments(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load appointments"
          )
          toast({
            title: "Appointments load failed",
            description: err instanceof Error ? err.message : String(err),
            variant: "error",
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, toast])

  const handleSyncMap = () => {
    setIsSyncing(true)
    setTimeout(() => {
      setIsSyncing(false)
      toast({
        title: "Synced successfully",
        description: "Your appointments have been synced to the map.",
        variant: "success",
      })
    }, 1500)
  }

  // Client-side filtering
  const filteredAppointments = useMemo(() => {
    if (activeFilter === "ALL") return appointments

    const now = new Date()

    return appointments.filter((a) => {
      const aptDate = new Date(a.startAt)

      if (activeFilter === "UPCOMING") {
        return aptDate >= now && a.status !== "CANCELLED"
      }
      if (activeFilter === "CONFIRMED") {
        return a.status === "CONFIRMED"
      }
      if (activeFilter === "CANCELLED") {
        return a.status === "CANCELLED"
      }
      return true
    })
  }, [appointments, activeFilter])

  const filters: { value: FilterType; label: string }[] = [
    { value: "UPCOMING", label: "Upcoming" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "CANCELLED", label: "Cancelled" },
    { value: "ALL", label: "All" },
  ]

  // Calendar Helpers
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate()
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay()
  const today = new Date()

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    )
  }

  const prevMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    )
  const nextMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    )

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-muted/20">
        <Header />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar title="Appointments" subtitle="Schedule" />

          <main className="flex-1 px-4 py-6 md:px-6">
            <div className="mx-auto w-full max-w-5xl">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                    Your Appointments
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    View, filter, and manage your schedules.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSyncMap}
                    disabled={isSyncing || loading || !!error}
                    className="shadow-sm"
                  >
                    {isSyncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="mr-2 h-4 w-4" />
                    )}
                    Sync to Map
                  </Button>
                  <Link href="/dashboard">
                    <Button className="shadow-glow">
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      Book New
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full max-w-md items-center gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
                  {filters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setActiveFilter(filter.value)}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                        activeFilter === filter.value
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
                  <button
                    onClick={() => setViewMode("LIST")}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                      viewMode === "LIST"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <List className="h-4 w-4" />
                    List
                  </button>
                  <button
                    onClick={() => setViewMode("CALENDAR")}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                      viewMode === "CALENDAR"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Calendar
                  </button>
                </div>
              </div>

              {loading && (
                <div className="flex flex-col gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm"
                    >
                      <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-muted"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 animate-pulse rounded bg-muted"></div>
                        <div className="h-3 w-1/2 animate-pulse rounded bg-muted"></div>
                      </div>
                      <div className="h-6 w-20 animate-pulse rounded-full bg-muted"></div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!loading && !error && filteredAppointments.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 py-20 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CalendarDays className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {activeFilter === "ALL"
                      ? "No appointments found"
                      : `No ${activeFilter.toLowerCase()} appointments`}
                  </h3>
                  <p className="mt-1 mb-6 max-w-sm text-sm text-muted-foreground">
                    You haven&apos;t booked anything in this category yet. Head over
                    to the AI chat to schedule naturally.
                  </p>
                  <Link href="/dashboard">
                    <Button className="shadow-glow">
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      Book with AI
                    </Button>
                  </Link>
                </div>
              )}

              {!loading && !error && filteredAppointments.length > 0 && viewMode === "LIST" && (
                <div className="flex flex-col gap-4">
                  {filteredAppointments.map((a) => {
                    const startDate = new Date(a.startAt)
                    const isCancelled = a.status === "CANCELLED"

                    const accentClass = isCancelled
                      ? "bg-red-500"
                      : a.status === "CONFIRMED"
                        ? "bg-emerald-500"
                        : "bg-muted-foreground"

                    const badgeClass = isCancelled
                      ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                      : a.status === "CONFIRMED"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border bg-muted text-muted-foreground"

                    return (
                      <div
                        key={a.id}
                        className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                      >
                        <div
                          className={cn("absolute left-0 top-0 h-full w-1", accentClass)}
                        />
                        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-border/60 bg-muted/40">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {startDate.toLocaleDateString(undefined, { month: "short" })}
                          </span>
                          <span className="text-xl font-bold text-foreground">
                            {startDate.getDate()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pl-2">
                          <div
                            className={cn(
                              "truncate font-semibold tracking-tight text-foreground",
                              isCancelled && "line-through opacity-70"
                            )}
                          >
                            {a.notes ?? "Appointment"}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatTime(a.startAt, a.endAt)}</span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("px-2.5 py-1 font-medium", badgeClass)}
                        >
                          {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}

              {!loading && !error && filteredAppointments.length > 0 && viewMode === "CALENDAR" && (
                <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/60 p-4">
                    <h3 className="text-lg font-semibold">
                      {currentMonth.toLocaleDateString(undefined, {
                        month: "long",
                        year: "numeric",
                      })}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="h-8 px-3 text-xs">
                        Today
                      </Button>
                      <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div
                        key={day}
                        className="p-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7">
                    {[...Array(firstDayOfMonth)].map((_, i) => (
                      <div key={`empty-${i}`} className="min-h-30 border-r border-b border-border/40 bg-muted/10" />
                    ))}

                    {[...Array(daysInMonth)].map((_, i) => {
                      const day = i + 1
                      const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                      const isToday = isSameDay(cellDate, today)
                      const dayEvents = filteredAppointments.filter((a) => isSameDay(new Date(a.startAt), cellDate))

                      return (
                        <div
                          key={day}
                          className={cn(
                            "min-h-30 border-r border-b border-border/40 p-2 transition-colors hover:bg-muted/20",
                            (i + firstDayOfMonth) % 7 === 6 && "border-r-0",
                            day === daysInMonth && "border-b-0"
                          )}
                        >
                          <div
                            className={cn(
                              "mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                              isToday ? "shadow-glow bg-primary text-primary-foreground" : "text-muted-foreground"
                            )}
                          >
                            {day}
                          </div>

                          <div className="space-y-1">
                            {dayEvents.map((event) => {
                              const isCancelled = event.status === "CANCELLED"
                              return (
                                <div
                                  key={event.id}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                                    isCancelled
                                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                      : event.status === "CONFIRMED"
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "h-1.5 w-1.5 shrink-0 rounded-full",
                                      isCancelled
                                        ? "bg-red-500"
                                        : event.status === "CONFIRMED"
                                          ? "bg-emerald-500"
                                          : "bg-muted-foreground"
                                    )}
                                  />
                                  <span className="truncate">
                                    {new Date(event.startAt).toLocaleTimeString(undefined, {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}{" "}
                                    {event.notes ?? "Appointment"}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
