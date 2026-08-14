"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/AuthProvider"
import { appointmentsApi, AvailableDate } from "@/lib/appointments"
import { Loader2 } from "lucide-react"


export function CalendarPicker({
  service,
  onSelect,
}: {
  service?: string
  onSelect: (date: string, time: string) => void
}) {
  const { token } = useAuth()
  const [dates, setDates] = useState<AvailableDate[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    appointmentsApi
      .availableDates(token)
      .then(setDates)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load dates")
      )
  }, [token])

  useEffect(() => {
    if (!token || !selectedDate) return

    let cancelled = false

    const loadSlots = async () => {
      setLoadingSlots(true)
      setSlots([])

      try {
        const nextSlots = await appointmentsApi.availableSlots(
          token,
          selectedDate,
          service
        )
        if (!cancelled) setSlots(nextSlots)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load slots")
        }
      } finally {
        if (!cancelled) setLoadingSlots(false)
      }
    }

    void loadSlots()

    return () => {
      cancelled = true
    }
  }, [token, selectedDate, service])

  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="mt-2 w-full rounded-2xl rounded-bl-md border border-border/60 bg-card p-3 shadow-sm sm:ml-10 sm:w-[calc(100%-2.5rem)] sm:p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        {service ? `Select a time for ${service}` : "Select a time"}
      </div>

      {/* Dates (Horizontal Scroll) */}
      <div className="flex scrollbar-thin gap-2 overflow-x-auto pb-2">
        {dates.map((d) => (
          <Button
            key={d.date}
            size="sm"
            variant={selectedDate === d.date ? "default" : "outline"}
            disabled={!d.available}
            onClick={() => setSelectedDate(d.date)}
            className="h-auto shrink-0 flex-col items-center rounded-xl px-3 py-1.5"
          >
            <span className="text-[10px] font-normal opacity-80">
              {new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "short",
              })}
            </span>
            <span className="text-sm font-bold">
              {new Date(`${d.date}T00:00:00`).getDate()}
            </span>
          </Button>
        ))}
      </div>

      {/* Times (Grid) */}
      {selectedDate && (
        <div className="mt-4 border-t border-border/50 pt-3">
          {loadingSlots && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loadingSlots && slots.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No slots available this day.
            </p>
          )}
          {!loadingSlots && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((time) => (
                <Button
                  key={time}
                  size="sm"
                  variant="outline"
                  onClick={() => onSelect(selectedDate, time)}
                  className="rounded-lg border-muted-foreground/20 hover:border-primary hover:text-primary"
                >
                  {time}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
