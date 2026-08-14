"use client"
import React, { useEffect, useMemo, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/components/AuthProvider'
import { AppTopbar, Header } from '@/components/Header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type LogItem = {
  id: string
  model?: string
  status?: string
  latencyMs?: number
  inputTokens?: number
  outputTokens?: number
  createdAt?: string
  reply?: string | null
}

function formatDateTime(value?: string) {
  if (!value) return 'N/A'

  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getStatusTone(status?: string) {
  const value = (status ?? 'N/A').toUpperCase()

  if (value.includes('SUCCESS') || value.includes('OK') || value.includes('COMPLETED')) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  }

  if (value.includes('ERROR') || value.includes('FAILED') || value.includes('REJECTED')) {
    return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
  }

  if (value.includes('PENDING') || value.includes('RUNNING')) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
  }

  return 'border-border bg-muted text-muted-foreground'
}

export default function LogsPage() {
  const { token } = useAuth()
  const [logs, setLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 8

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
    fetch(`${API}/chat/logs`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setLogs(data || [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [token])

  const statusOptions = useMemo(() => {
    const values = logs
      .map((log) => (log.status ?? '').trim())
      .filter(Boolean)
      .map((value) => value.toUpperCase())

    return Array.from(new Set(values))
  }, [logs])

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return logs.filter((log) => {
      const status = (log.status ?? '').toUpperCase()
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      const matchesQuery =
        query.length === 0 ||
        [log.model, log.reply, status, log.id].join(' ').toLowerCase().includes(query)

      return matchesStatus && matchesQuery
    })
  }, [logs, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLogs.slice(start, start + pageSize)
  }, [currentPage, filteredLogs])

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    setPage(1)
  }

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value)
    setPage(1)
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-muted/20">
        <Header />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar title="Logs" subtitle="AI interactions" />
          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-6xl">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">AI Interaction Logs</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Review conversations, status, usage, and response details.
                  </p>
                </div>
              </div>

              <div className="mb-4 flex w-full flex-col gap-3 rounded-xl border border-border/60 bg-card p-3 lg:flex-row lg:items-center">
                <Input
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search model, reply, or id..."
                  className="w-full lg:max-w-sm"
                />

                <select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring lg:max-w-52"
                  aria-label="Filter logs by status"
                >
                  <option value="all">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {loading && (
                <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                        <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                      </div>
                      <div className="h-3 w-full animate-pulse rounded bg-muted" />
                      <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              )}

              {!loading && filteredLogs.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/80 bg-card p-6 text-sm text-muted-foreground">
                  No logs match the current filters.
                </div>
              )}

              {!loading && filteredLogs.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                  <div className="hidden md:block">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">Model</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Latency</th>
                            <th className="px-4 py-3 font-medium">Tokens</th>
                            <th className="px-4 py-3 font-medium">Created</th>
                            <th className="px-4 py-3 font-medium text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedLogs.map((log) => (
                            <React.Fragment key={log.id}>
                              <tr
                                className="border-t border-border/60 align-top transition-colors hover:bg-muted/30"
                                onClick={() => setExpandedId((current) => (current === log.id ? null : log.id))}
                                style={{ cursor: 'pointer' }}
                              >
                                <td className="px-4 py-3">
                                  <div className="font-medium text-foreground">{log.model ?? 'Model'}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">{log.id}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className={getStatusTone(log.status)}>
                                    {log.status ?? 'N/A'}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {log.latencyMs ?? 0} ms
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {log.inputTokens ?? 0} / {log.outputTokens ?? 0}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {formatDateTime(log.createdAt)}
                                </td>
                                <td className="px-4 py-3 text-right text-xs font-medium text-primary">
                                  {expandedId === log.id ? 'Hide' : 'View'}
                                </td>
                              </tr>

                              {expandedId === log.id && (
                                <tr className="border-t border-border/60 bg-muted/20">
                                  <td colSpan={6} className="p-4">
                                    <div className="grid gap-4 md:grid-cols-[1.5fr_0.9fr]">
                                      <div className="rounded-lg border border-border/60 bg-background p-3">
                                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                          Response
                                        </div>
                                        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                                          {log.reply || 'No reply parsed for this request.'}
                                        </p>
                                      </div>

                                      <div className="space-y-3 rounded-lg border border-border/60 bg-background p-3">
                                        <div>
                                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                            Usage
                                          </div>
                                          <div className="mt-2 space-y-2 text-sm text-foreground">
                                            <div className="flex items-center justify-between gap-3">
                                              <span className="text-muted-foreground">Input tokens</span>
                                              <span>{log.inputTokens ?? 0}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                              <span className="text-muted-foreground">Output tokens</span>
                                              <span>{log.outputTokens ?? 0}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                              <span className="text-muted-foreground">Latency</span>
                                              <span>{log.latencyMs ?? 0} ms</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3 p-3 md:hidden">
                    {paginatedLogs.map((log) => (
                      <button
                        key={log.id}
                        type="button"
                        onClick={() => setExpandedId((current) => (current === log.id ? null : log.id))}
                        className="w-full rounded-xl border border-border/60 bg-background p-3 text-left shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">
                              {log.model ?? 'Model'}
                            </div>
                            <div className="mt-1 truncate text-[11px] text-muted-foreground">
                              {log.id}
                            </div>
                          </div>
                          <Badge variant="outline" className={getStatusTone(log.status)}>
                            {log.status ?? 'N/A'}
                          </Badge>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                          <div>
                            <div className="font-medium uppercase tracking-wide text-muted-foreground/80">Latency</div>
                            <div className="mt-1 text-foreground">{log.latencyMs ?? 0} ms</div>
                          </div>
                          <div>
                            <div className="font-medium uppercase tracking-wide text-muted-foreground/80">Tokens</div>
                            <div className="mt-1 text-foreground">{log.inputTokens ?? 0} / {log.outputTokens ?? 0}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="font-medium uppercase tracking-wide text-muted-foreground/80">Created</div>
                            <div className="mt-1 text-foreground">{formatDateTime(log.createdAt)}</div>
                          </div>
                        </div>

                        {expandedId === log.id && (
                          <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                            <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Response
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                              {log.reply || 'No reply parsed for this request.'}
                            </p>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {Math.min((currentPage - 1) * pageSize + 1, filteredLogs.length)}-{Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                          <Button
                            key={pageNumber}
                            variant={pageNumber === currentPage ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setPage(pageNumber)}
                          >
                            {pageNumber}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
