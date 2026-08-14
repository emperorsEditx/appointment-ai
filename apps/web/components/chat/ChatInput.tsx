"use client"
import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend?: (text: string) => void
  disabled?: boolean
}) {
  const [value, setValue] = useState("")

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!value.trim() || disabled) return
    onSend?.(value.trim())
    setValue("")
  }

  return (
    <form
      onSubmit={submit}
      className="relative flex items-center border-t border-border/50 bg-background/50 p-2 backdrop-blur-sm sm:p-3"
    >
      <Input
        placeholder="Ask to book an appointment..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        className="h-11 rounded-full border-muted-foreground/20 bg-muted/40 pl-4 pr-12 text-sm focus-visible:ring-primary sm:h-12 sm:pl-5"
      />
      <Button
        type="submit"
        size="icon"
        disabled={!value.trim() || disabled}
        className="shadow-glow absolute right-5 h-8 w-8 rounded-full sm:right-6 sm:h-9 sm:w-9"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}
