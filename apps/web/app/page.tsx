import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, CalendarClock } from "lucide-react" // Assuming you use lucide-react

export default function Page() {
  return (
    <div className="p-8 relative flex min-h-screen flex-col items-center justify-center">
      <main className="max-w-3xl mx-auto flex w-full flex-col items-center text-center">
        {/* Trust Badge */}
        <div className="mb-8 gap-2 border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary inline-flex items-center rounded-full border">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Powered by Conversational AI</span>
        </div>

        {/* Headline */}
        <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
          Book appointments <br />
          <span className="text-gradient">the natural way.</span>
        </h1>

        {/* Subtext */}
        <p className="mb-10 max-w-xl text-lg text-muted-foreground md:text-xl">
          Appointment AI understands your requests, checks real-time
          availability, and schedules instantly. No forms, no friction.
        </p>

        {/* CTAs */}
        <div className="max-w-md gap-3 sm:flex-row sm:justify-center flex w-full flex-col">
          <Link href="/login" className="flex-1">
            <Button variant="outline" size="lg" className="w-full">
              Login
            </Button>
          </Link>
          <Link href="/signup" className="flex-1">
            <Button size="lg" className="shadow-glow w-full">
              <CalendarClock className="mr-2 h-4 w-4" />
              Get Started
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
