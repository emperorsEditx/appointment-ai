"use client"
import React, { useEffect } from "react"
import { useAuth } from "./AuthProvider"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!token) {
      router.replace("/login")
    }
  }, [token, router])

  if (!token) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return <>{children}</>
}
