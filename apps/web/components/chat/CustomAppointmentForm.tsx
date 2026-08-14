"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { useToast } from "@/components/ToastProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { appointmentsApi } from "@/lib/appointments"
import { cn } from "@/lib/utils"
import { CalendarPlus, Loader2 } from "lucide-react"

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function CustomAppointmentForm({
  onBooked,
  onSuccess,
  disabled,
  className,
  showHeader = true,
}: {
  onBooked?: (message: string) => void
  onSuccess?: () => void
  disabled?: boolean
  className?: string
  showHeader?: boolean
}) {
  const { token } = useAuth()
  const { toast } = useToast()

  const [service, setService] = useState("")
  const [date, setDate] = useState(toDateInputValue(new Date()))
  const [time, setTime] = useState("")
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const noSlotsAvailable = !loadingSlots && slots.length === 0

  const isTimeAvailable = useMemo(() => {
    if (!time) return false
    return slots.includes(time)
  }, [slots, time])

  useEffect(() => {
    if (!token || !date) return

    let cancelled = false

    const loadSlots = async () => {
      setLoadingSlots(true)

      try {
        const result = await appointmentsApi.availableSlots(
          token,
          date,
          service.trim() || undefined
        )

        if (cancelled) return
        setSlots(result)
        if (result.length === 0) setTime("")
      } catch (err) {
        if (cancelled) return
        toast({
          title: "Could not load available slots",
          description: err instanceof Error ? err.message : String(err),
          variant: "error",
        })
      } finally {
        if (!cancelled) setLoadingSlots(false)
      }
    }

    void loadSlots()

    return () => {
      cancelled = true
    }
  }, [token, date, service, toast])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return

    if (!date || !time) {
      toast({
        title: "Missing fields",
        description: "Please provide date and time.",
        variant: "info",
      })
      return
    }

    if (!isTimeAvailable) {
      toast({
        title: "Selected slot is unavailable",
        description:
          "That time overlaps an existing booking. Please choose an available slot.",
        variant: "error",
      })
      return
    }

    try {
      const result = await appointmentsApi.create(token, {
        preferredDate: date,
        preferredTime: time,
        service: service.trim() || undefined,
      })

      const bookedDate = new Date(result.appointment.startAt)
      const summary = result.alreadyExisted
        ? `Appointment already exists for ${bookedDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.`
        : `Appointment scheduled for ${bookedDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.`

      toast({
        title: result.alreadyExisted ? "Already booked" : "Appointment scheduled",
        description: summary,
        variant: result.alreadyExisted ? "info" : "success",
      })

      onBooked?.(summary)
      onSuccess?.()
      setTime("")
    } catch (err) {
      toast({
        title: "Could not schedule appointment",
        description: err instanceof Error ? err.message : String(err),
        variant: "error",
      })
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-3", className)}
    >
      {showHeader && (
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Custom Appointment
          </p>
          {loadingSlots && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="service">Service</Label>
          <Input
            id="service"
            placeholder="Haircut, Consultation..."
            value={service}
            onChange={(e) => setService(e.target.value)}
            disabled={disabled}
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={disabled}
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="time">Time</Label>
          <Input
            id="time"
            list="appointment-slots"
            placeholder="e.g. 10:00 AM"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={disabled || loadingSlots || noSlotsAvailable}
            className="h-9"
          />
          <datalist id="appointment-slots">
            {slots.map((slot) => (
              <option value={slot} key={slot} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="truncate text-xs text-muted-foreground">
          {slots.length > 0
            ? `${slots.length} available slot${slots.length > 1 ? "s" : ""} for this day`
            : "No available slots for the selected date/service."}
        </p>
        <Button
          type="submit"
          size="sm"
          className="h-8"
          disabled={disabled || loadingSlots || noSlotsAvailable || !date || !time}
        >
          <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
          Schedule Manually
        </Button>
      </div>
    </form>
  )
}
