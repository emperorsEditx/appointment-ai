"use client"
import React, { createContext, useContext, useMemo, useState } from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react" // Assuming lucide-react

type ToastVariant = "info" | "success" | "error"
type Toast = {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

type ToastContextValue = {
  toast: (t: {
    title: string
    description?: string
    variant?: ToastVariant
  }) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (t: {
    title: string
    description?: string
    variant?: ToastVariant
  }) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const nt: Toast = {
      id,
      title: t.title,
      description: t.description,
      variant: t.variant ?? "info",
    }
    setToasts((s) => [...s, nt])

    setTimeout(() => {
      setToasts((s) => s.filter((x) => x.id !== id))
    }, 6000)
  }

  const value = useMemo(() => ({ toast }), [])

  const variantStyles = {
    info: {
      border: "border-l-blue-500",
      icon: Info,
      iconColor: "text-blue-500",
    },
    success: {
      border: "border-l-emerald-500",
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
    },
    error: {
      border: "border-l-red-500",
      icon: AlertCircle,
      iconColor: "text-red-500",
    },
  }

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container */}
      <div className="top-4 right-4 max-w-sm gap-3 fixed z-50 flex w-full flex-col">
        {toasts.map((t) => {
          const style = variantStyles[t.variant || "info"]
          const Icon = style.icon

          return (
            <div
              key={t.id}
              className={`glass-panel gap-3 rounded-xl pointer-events-auto flex w-full items-start border-l-4 ${style.border} p-4 shadow-xl animate-in slide-in-from-right-5 fade-in-20 transition-all duration-300`}
            >
              <Icon
                className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`}
              />
              <div className="space-y-1 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {t.title}
                </p>
                {t.description && (
                  <p className="text-sm text-muted-foreground">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
