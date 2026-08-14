export type Appointment = {
  id: string
  startAt: string
  endAt: string
  status: "CONFIRMED" | "CANCELLED"
  notes: string | null
}

export type CreateAppointmentInput = {
  preferredDate: string
  preferredTime: string
  service?: string
}

export type CreateAppointmentResult = {
  appointment: Appointment
  alreadyExisted: boolean
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export type AvailableDate = { date: string; available: boolean }

export const appointmentsApi = {
  create: async (
    token: string,
    input: CreateAppointmentInput
  ): Promise<CreateAppointmentResult> => {
    // Build an ISO timestamp from the user's local date+time to preserve their intent across server timezones
    const [year, month, day] = input.preferredDate.split('-').map(Number)
    // Normalize time like '10:00 AM' or '14:30' into hours/minutes
    function normalize(time: string) {
      const hhmm = /^\d{2}:\d{2}$/
      if (hhmm.test(time)) return time
      const m = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/)
      if (m) {
        let hour = Number(m[1])
        const minute = Number(m[2])
        const ampm = m[3].toUpperCase()
        if (ampm === 'PM' && hour < 12) hour += 12
        if (ampm === 'AM' && hour === 12) hour = 0
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      }
      const simple = time.match(/^(\d{1,2}):(\d{2})$/)
      if (simple) return simple[1].padStart(2, '0') + ':' + simple[2]
      throw new Error('Invalid time format')
    }

    const [hourStr, minuteStr] = normalize(input.preferredTime).split(':')
    const startAtDate = new Date(year, month - 1, day, Number(hourStr), Number(minuteStr))
    const payload = { ...input, startAt: startAtDate.toISOString() }

    const res = await fetch(`${API}/appointments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  list: async (
    token: string,
    status?: "CONFIRMED" | "CANCELLED"
  ): Promise<Appointment[]> => {
    const qs = status ? `?status=${status}` : ""
    const res = await fetch(`${API}/appointments${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  availableDates: async (
    token: string,
    days = 14
  ): Promise<AvailableDate[]> => {
    const res = await fetch(
      `${API}/appointments/available-dates?days=${days}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  availableSlots: async (
    token: string,
    date: string,
    service?: string
  ): Promise<string[]> => {
    const qs = service ? `&service=${encodeURIComponent(service)}` : ""
    const res = await fetch(
      `${API}/appointments/available-slots?date=${date}${qs}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}
