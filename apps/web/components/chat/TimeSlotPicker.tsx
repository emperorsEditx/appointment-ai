"use client"

export function TimeSlotPicker({
  slots,
  onPick,
}: {
  slots?: string[]
  onPick?: (s: string) => void
}) {
  const items = slots ?? ["09:00 AM", "09:30 AM", "10:00 AM", "11:00 AM"]

  return (
    <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4">
      {items.map((s) => (
        <button
          key={s}
          onClick={() => onPick?.(s)}
          className="rounded-lg border border-muted-foreground/20 px-3 py-2 text-sm transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          {s}
        </button>
      ))}
    </div>
  )
}
