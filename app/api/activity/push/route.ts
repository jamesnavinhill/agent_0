import { NextResponse } from 'next/server'
import { pushActivity } from '@/lib/activity/bus'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body || !body.action) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
    }

    pushActivity({
      id: body.id,
      action: body.action,
      details: body.details,
      timestamp: body.timestamp ?? Date.now(),
      status: body.status,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
}
