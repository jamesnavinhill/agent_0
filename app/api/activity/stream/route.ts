import { NextResponse } from 'next/server'
import { subscribeActivity, getRecentActivities } from '@/lib/activity/bus'

export async function GET(req: Request) {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })

  const stream = new ReadableStream({
    async start(controller) {
      // send recent activities
      const recent = getRecentActivities()
      controller.enqueue(encode(`event: connected\ndata: ${JSON.stringify({ time: Date.now(), recentCount: recent.length })}\n\n`))

      for (const r of recent) {
        controller.enqueue(encode(`event: activity\ndata: ${JSON.stringify(r)}\n\n`))
      }

      const unsub = subscribeActivity((ev) => {
        try {
          controller.enqueue(encode(`event: activity\ndata: ${JSON.stringify(ev)}\n\n`))
        } catch {}
      })

      const { signal } = req as any
      if (signal) {
        signal.addEventListener('abort', () => {
          unsub()
          try { controller.close() } catch {}
        })
      }
    }
  })

  return new Response(stream, { headers })
}

function encode(s: string) {
  return new TextEncoder().encode(s)
}
