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
    const res = await fetch(`${API}/appointments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
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
