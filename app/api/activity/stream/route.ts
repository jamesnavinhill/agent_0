import { NextResponse } from 'next/server'
import { subscribeActivity, getRecentActivities } from '@/lib/activity/bus'
import { getDbActivities } from '@/lib/activity/db-store'
import { isDatabaseConfigured } from '@/lib/db/neon'

export async function GET(req: Request) {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })

  const stream = new ReadableStream({
    async start(controller) {
      // Load recent activities - prefer database if available
      let recent
      if (isDatabaseConfigured()) {
        recent = await getDbActivities({ limit: 200 })
      } else {
        recent = getRecentActivities()
      }

      controller.enqueue(encode(`event: connected\ndata: ${JSON.stringify({ time: Date.now(), recentCount: recent.length, source: isDatabaseConfigured() ? 'database' : 'memory' })}\n\n`))

      for (const r of recent) {
        controller.enqueue(encode(`event: activity\ndata: ${JSON.stringify(r)}\n\n`))
      }

      // Subscribe to new real-time events via EventEmitter
      const unsub = subscribeActivity((ev) => {
        try {
          controller.enqueue(encode(`event: activity\ndata: ${JSON.stringify(ev)}\n\n`))
        } catch { }
      })

      const { signal } = req as any
      if (signal) {
        signal.addEventListener('abort', () => {
          unsub()
          try { controller.close() } catch { }
        })
      }
    }
  })

  return new Response(stream, { headers })
}

function encode(s: string) {
  return new TextEncoder().encode(s)
}
