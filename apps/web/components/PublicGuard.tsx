"use client"
import React, { useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { useRouter } from 'next/navigation'

export default function PublicGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (token) {
      router.replace('/dashboard')
    }
  }, [token, router])

  return <>{!token ? children : null}</>
}
