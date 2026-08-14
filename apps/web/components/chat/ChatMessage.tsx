import { Sparkles, UserRound } from "lucide-react"

export function ChatMessage({
  text,
  from,
}: {
  text: string
  from: "user" | "ai"
}) {
  const isUser = from === "user"

  return (
    <div
      className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="shadow-glow flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
      )}

      <div
        className={`max-w-[85%] px-3 py-2.5 text-sm shadow-sm sm:max-w-[75%] sm:px-4 ${
          isUser
            ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
            : "rounded-2xl rounded-bl-md border border-border/60 bg-card"
        }`}
      >
        {text}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
          <UserRound className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
