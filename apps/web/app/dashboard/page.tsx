"use client"

import { useState } from "react"
import { AppTopbar, Header } from "@/components/Header"
import { ChatContainer } from "@/components/chat/ChatContainer"
import { CustomAppointmentForm } from "@/components/chat/CustomAppointmentForm"
import AuthGuard from "@/components/AuthGuard"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export default function DashboardPage() {
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)

  return (
    <AuthGuard>
      <div className="flex h-screen min-h-screen overflow-hidden bg-muted/20">
        <Header />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AppTopbar title="Dashboard" subtitle="AI Receptionist" />

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col">
              <div className="mb-4 shrink-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold tracking-tight">
                        AI Receptionist
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Chat naturally to book, modify, or cancel appointments.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 self-start sm:self-auto"
                    onClick={() => setIsManualModalOpen(true)}
                  >
                    Manual booking
                  </Button>
                </div>
              </div>

              <div className="glass-panel relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
                <ChatContainer />
              </div>
            </div>

            <Sheet open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
              <SheetContent side="right" className="w-full sm:max-w-lg">
                <SheetHeader className="border-b border-border/60 pb-4">
                  <SheetTitle>Manual Appointment</SheetTitle>
                  <SheetDescription>
                    Schedule directly with the same validation and overlap rules
                    as AI booking.
                  </SheetDescription>
                </SheetHeader>

                <div className="p-4">
                  <CustomAppointmentForm
                    onSuccess={() => setIsManualModalOpen(false)}
                    showHeader={false}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
