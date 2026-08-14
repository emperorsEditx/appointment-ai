"use client"
import { Button } from "@/components/ui/button"
import { Calendar, CalendarClock, CalendarX } from "lucide-react"

export function ChatSuggestions({ onPick }: { onPick?: (s: string) => void }) {
  const items = [
    { text: "I need a haircut", icon: Calendar },
    { text: "Book a dentist appointment", icon: CalendarClock },
    { text: "Cancel my next meeting", icon: CalendarX },
  ]

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {items.map((item) => (
        <Button
          key={item.text}
          variant="outline"
          size="sm"
          onClick={() => onPick?.(item.text)}
          className="rounded-full border-muted-foreground/20 bg-background/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <item.icon className="mr-2 h-3.5 w-3.5" />
          {item.text}
        </Button>
      ))}
    </div>
  )
}
