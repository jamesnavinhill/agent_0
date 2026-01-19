import { NextRequest, NextResponse } from "next/server"
import { getGoals, createGoal, updateGoal, deleteGoal } from "@/lib/db/goals"

export async function GET() {
  try {
    const goals = await getGoals()
    return NextResponse.json(goals)
  } catch (error) {
    console.error("Failed to fetch goals:", error)
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const goal = await createGoal(body)
    return NextResponse.json(goal)
  } catch (error) {
    console.error("Failed to create goal:", error)
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
    
    const goal = await updateGoal(id, updates)
    return NextResponse.json(goal)
  } catch (error) {
    console.error("Failed to update goal:", error)
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

    await deleteGoal(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete goal:", error)
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 })
  }
}
