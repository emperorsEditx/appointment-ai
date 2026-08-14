"use client"
import React, { useState, useRef, useEffect, useCallback } from "react"
import { ChatMessage } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { ChatSuggestions } from "./ChatSuggestions"
import { CalendarPicker } from "./CalendarPicker"
import { useAuth } from "@/components/AuthProvider"
import { useToast } from "@/components/ToastProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Pencil } from "lucide-react"
import Image from "next/image";

type ChatMessageMeta = {
  component: "calendar"
  service?: string
}

type ChatMessageItem = {
  id: string
  text: string
  from: "user" | "ai"
  meta?: ChatMessageMeta
}

type SessionSummary = {
  id: string
  title: string | null
  lastMessage: string
  createdAt: string
  updatedAt: string
}

export function ChatContainer({ messages }: { messages?: ChatMessageItem[] }) {
  const initial: ChatMessageItem[] = messages ?? [
    {
      id: "1",
      text: "Hi there! I'm your AI booking assistant. How can I help you today?",
      from: "ai",
    },
  ]

  const { token, user } = useAuth()
  const { toast } = useToast()

  const storageKey = user ? `chatSession:${user.id}` : "chatSession:anon"

  const [msgs, setMsgs] = useState<ChatMessageItem[]>(initial)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [sessionList, setSessionList] = useState<SessionSummary[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  function displaySessionTitle(session: SessionSummary, index: number) {
    const cleanTitle = session.title?.trim()
    if (cleanTitle) return cleanTitle

    const createdAtLabel = new Date(session.createdAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })

    return `Chat ${index + 1} • ${createdAtLabel}`
  }

  const refreshSessionList = useCallback(async () => {
    if (!token) return

    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
    const res = await fetch(`${API}/chat/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return

    const sessions = await res.json()
    if (Array.isArray(sessions)) {
      setSessionList(sessions as SessionSummary[])
      const latest = sessions[0]
      if (latest?.id) {
        setSessionId((current) => current ?? latest.id)
        localStorage.setItem(storageKey, latest.id)
      }
    }
  }, [storageKey, token])

  async function loadSession(nextSessionId?: string) {
    if (!token) return

    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
    const url = nextSessionId
      ? `${API}/chat/session/${nextSessionId}`
      : `${API}/chat/session/latest`

    try {
      setIsLoadingHistory(true)
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return

      const data = await res.json()
      if (!data) return

      if (data.sessionId) {
        setSessionId(data.sessionId)
        localStorage.setItem(storageKey, data.sessionId)
        await refreshSessionList()
      }

      if (data.messages?.length) {
        setMsgs(data.messages as ChatMessageItem[])
      } else {
        setMsgs([
          {
            id: "welcome",
            text: "Hi there! I'm your AI booking assistant. How can I help you today?",
            from: "ai",
          },
        ])
      }
    } catch {
      // ignore load errors silently
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Auto-scroll to bottom on new messages or typing state change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [msgs, isTyping])

  useEffect(() => {
    if (!token) return

    const timeout = window.setTimeout(async () => {
      const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

      setIsLoadingHistory(true)

      try {
        await refreshSessionList()

        const stored = localStorage.getItem(storageKey)
        const url = stored
          ? `${API}/chat/session/${stored}`
          : `${API}/chat/session/latest`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) return

        const data = await res.json()
        if (data?.sessionId) {
          setSessionId(data.sessionId)
          localStorage.setItem(storageKey, data.sessionId)
        }

        if (data?.messages?.length) {
          setMsgs(data.messages as ChatMessageItem[])
        } else {
          setMsgs([
            {
              id: "welcome",
              text: "Hi there! I'm your AI booking assistant. How can I help you today?",
              from: "ai",
            },
          ])
        }
      } catch {
        // ignore load errors silently
      } finally {
        setIsLoadingHistory(false)
      }
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [refreshSessionList, storageKey, token])

  async function handleNewSession() {
    if (!token) return

    try {
      setIsLoadingHistory(true)
      const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const res = await fetch(`${API}/chat/session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error((await res.text()) || res.statusText)

      const data = await res.json()
      if (!data?.sessionId) throw new Error("No session returned")

      setSessionId(data.sessionId)
      localStorage.setItem(storageKey, data.sessionId)
      setSessionList((current) => [
        {
          id: data.sessionId,
          title: null,
          lastMessage: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...current.filter((session) => session.id !== data.sessionId),
      ])
      setMsgs([
        {
          id: "welcome-new",
          text: "Hi there! I'm your AI booking assistant. How can I help you today?",
          from: "ai",
        },
      ])
      toast({
        title: "New chat started",
        description: "Your previous session remains available in history.",
        variant: "success",
      })
    } catch {
      toast({
        title: "Could not start a new chat",
        description: "Please try again.",
        variant: "error",
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  async function handleSend(text: string) {
    const userMsg: ChatMessageItem = {
      id: `u-${Date.now()}`,
      text,
      from: "user",
    }
    setMsgs((s) => [...s, userMsg])
    setIsTyping(true)

    try {
      const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const tzOffset = new Date().getTimezoneOffset()
      const clientNow = new Date().toISOString()

      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, sessionId, clientTz: tz, tzOffsetMinutes: tzOffset, clientNow }),
      })

      if (!res.ok) throw new Error((await res.text()) || res.statusText)

      const data = await res.json()
      if (data?.sessionId) {
        setSessionId(data.sessionId)
        localStorage.setItem(storageKey, data.sessionId)
        setSessionList((current) => {
          const existing = current.find(
            (session) => session.id === data.sessionId
          )
          if (existing) return current
          return [
            {
              id: data.sessionId,
              title: null,
              lastMessage: "",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...current,
          ]
        })
      }

      const aiMsg: ChatMessageItem = {
        id: `a-${Date.now()}`,
        text: data?.message ?? "Received",
        from: "ai",
        meta: data?.meta,
      }

      setMsgs((s) => [...s, aiMsg])

      if (data?.error) {
        toast({
          title: "Server error",
          description: data.error.message,
          variant: "error",
        })
      }
    } catch {
      setMsgs((s) => [
        ...s,
        {
          id: `e-${Date.now()}`,
          text: "I'm having trouble connecting to the server.",
          from: "ai",
        },
      ])
      toast({
        title: "Chat error",
        description: "Failed to send message",
        variant: "error",
      })
    } finally {
      setIsTyping(false)
    }
  }

  function handleSlotSelect(date: string, time: string) {
    handleSend(`${date} at ${time}`)
  }

  async function handleSaveSessionTitle(session: SessionSummary) {
    if (!token) return

    const nextTitle = editingTitle.trim()
    if (!nextTitle) {
      toast({
        title: "Session name required",
        description: "Please enter a session name.",
        variant: "info",
      })
      return
    }

    try {
      setIsSavingTitle(true)
      const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const res = await fetch(`${API}/chat/session/${session.id}/title`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: nextTitle }),
      })

      if (!res.ok) throw new Error((await res.text()) || res.statusText)

      setSessionList((current) =>
        current.map((item) =>
          item.id === session.id ? { ...item, title: nextTitle } : item
        )
      )
      setEditingSessionId(null)
      setEditingTitle("")
      toast({ title: "Session renamed", variant: "success" })
    } catch (err) {
      toast({
        title: "Could not rename session",
        description: err instanceof Error ? err.message : String(err),
        variant: "error",
      })
    } finally {
      setIsSavingTitle(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden md:flex-row">
      <aside className="flex min-h-0 flex-col border-b border-border/60 bg-background/60 md:w-72 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <span className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Sessions
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewSession}
            className="h-8"
          >
            New chat
          </Button>
        </div>

        <div className="chat-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {sessionList.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 px-3 py-3 text-xs text-muted-foreground">
              No sessions yet.
            </div>
          ) : (
            sessionList.map((item, idx) => {
              const isActive = item.id === sessionId
              const isEditing = editingSessionId === item.id
              return (
                <div
                  key={item.id}
                  className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                    isActive
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/40 bg-card/50 hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {isEditing ? (
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="h-8 text-xs"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSessionId(item.id)
                          localStorage.setItem(storageKey, item.id)
                          void loadSession(item.id)
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium text-foreground">
                          {displaySessionTitle(item, idx)}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {item.lastMessage || "No messages yet"}
                        </p>
                      </button>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => void handleSaveSessionTitle(item)}
                          disabled={isSavingTitle}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => {
                            setEditingSessionId(null)
                            setEditingTitle("")
                          }}
                          disabled={isSavingTitle}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingSessionId(item.id)
                          setEditingTitle(item.title ?? "")
                        }}
                        aria-label="Rename session"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Messages Area - min-h-0 is the magic trick that allows this specific flex child to scroll */}
        <div className="chat-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {isLoadingHistory ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-end justify-start gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2 rounded-2xl rounded-bl-md border border-border/60 bg-card px-4 py-3 shadow-sm">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <div className="flex items-end justify-end gap-2">
              <div className="space-y-2 rounded-2xl rounded-br-md border border-border/60 bg-primary/5 px-4 py-3 shadow-sm">
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
            <div className="flex items-end justify-start gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2 rounded-2xl rounded-bl-md border border-border/60 bg-card px-4 py-3 shadow-sm">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {msgs.map((m) => (
              <div key={m.id} className="space-y-2">
                <ChatMessage text={m.text} from={m.from} />
                {m.from === "ai" && m.meta?.component === "calendar" && (
                  <CalendarPicker
                    service={m.meta.service}
                    onSelect={handleSlotSelect}
                  />
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-end justify-start gap-2">
                <div className="shadow-glow flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground overflow-hidden">
                  {/* agent icon */}
                  <Image src="/agent.png" alt="Agent" width={25} height={25} />
                </div>
                <div className="rounded-2xl rounded-bl-md border border-border/60 bg-card px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

          {/* Scroll Target */}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Footer Area (Suggestions + Input) - shrink-0 ensures it never gets squeezed out */}
        <div className="shrink-0 border-t border-border/50 bg-background/50 backdrop-blur-sm">
          {/* Suggestions (only show if chat is short) */}
          {!isLoadingHistory && msgs.length <= 2 && !isTyping && (
            <ChatSuggestions onPick={handleSend} />
          )}

          {/* Input Area */}
          <ChatInput
            onSend={handleSend}
            disabled={isTyping || isLoadingHistory}
          />
        </div>
      </div>
    </div>
  )
}
