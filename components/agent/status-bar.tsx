"use client"

import { useAgentStore } from "@/lib/store/agent-store"
import { cn } from "@/lib/utils"
import {
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  Radio,
} from "lucide-react"
import { useEffect, useState } from "react"

export function StatusBar() {
  const { state, activities, memories, outputs } = useAgentStore()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const runningActivities = activities.filter((a) => a.status === "running").length

  return (
    <div className="h-6 border-t border-border bg-surface-1 flex items-center justify-between px-3 text-[10px] text-muted-foreground">
      <div className="flex items-center gap-4">
        {/* Agent state */}
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            state === "idle" ? "bg-green-500" :
            state === "thinking" || state === "creating" ? "bg-accent animate-pulse" :
            state === "error" ? "bg-destructive" : "bg-muted"
          )} />
          <span className="capitalize">{state}</span>
        </div>
        
        {/* Running tasks */}
        {runningActivities > 0 && (
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3" />
            <span>{runningActivities} active</span>
          </div>
        )}
        
        {/* Memory */}
        <div className="flex items-center gap-1.5 hidden sm:flex">
          <HardDrive className="w-3 h-3" />
          <span>{memories.length} memories</span>
        </div>
        
        {/* Outputs */}
        <div className="flex items-center gap-1.5 hidden sm:flex">
          <Radio className="w-3 h-3" />
          <span>{outputs.length} creations</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-green-500" />
          <span>Connected</span>
        </div>
        
        {/* Time */}
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>{time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>
    </div>
  )
}
