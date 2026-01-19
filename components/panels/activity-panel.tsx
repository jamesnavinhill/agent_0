"use client"

import React from "react"

import { useAgentStore, type ActivityEntry } from "@/lib/store/agent-store"
import { useScheduler } from "@/hooks/use-scheduler"
import { cn } from "@/lib/utils"
import { useRef, useEffect } from "react"
import { 
  Activity, 
  CheckCircle, 
  Circle, 
  AlertCircle, 
  Loader2,
  Zap,
  Clock,
  PlayCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const statusConfig: Record<ActivityEntry["status"], { icon: React.ElementType; color: string }> = {
  pending: { icon: Circle, color: "text-muted-foreground" },
  running: { icon: Loader2, color: "text-accent" },
  complete: { icon: CheckCircle, color: "text-green-500" },
  error: { icon: AlertCircle, color: "text-destructive" },
}

export function ActivityPanel() {
  const { activities, state } = useAgentStore()
  const { isRunning, currentExecution, executions, toggle } = useScheduler()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activities, executions])

  const groupedActivities = activities.reduce((acc, activity) => {
    const date = activity.timestamp.toLocaleDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(activity)
    return acc
  }, {} as Record<string, ActivityEntry[]>)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">Activity Log</span>
          {isRunning && (
            <Badge variant="outline" className="h-5 text-[10px] gap-1 bg-accent/10 border-accent/30">
              <Zap className="w-2.5 h-2.5" />
              Live
            </Badge>
          )}
        </div>
        <Button
          variant={isRunning ? "secondary" : "ghost"}
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={toggle}
        >
          {isRunning ? (
            <>
              <Clock className="w-3 h-3" />
              Pause
            </>
          ) : (
            <>
              <PlayCircle className="w-3 h-3" />
              Auto
            </>
          )}
        </Button>
      </div>
      
      {/* Current Execution Banner */}
      {currentExecution && (
        <div className="px-4 py-2 bg-accent/10 border-b border-accent/30 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          <span className="text-sm font-medium text-accent">
            Executing: {currentExecution.taskName}
          </span>
        </div>
      )}
      
      {/* Activity log */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
            <Activity className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Activity will be logged here</p>
          </div>
        ) : (
          Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <div key={date}>
              <div className="sticky top-0 px-4 py-2 bg-surface-1/80 backdrop-blur-sm">
                <span className="text-xs text-muted-foreground">{date}</span>
              </div>
              <div className="space-y-1 px-4 pb-4">
                {dateActivities.map((activity) => {
                  const { icon: StatusIcon, color } = statusConfig[activity.status]
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 py-2 border-l-2 border-border pl-3 hover:bg-surface-2/50 -ml-px rounded-r transition-colors"
                    >
                      <StatusIcon className={cn(
                        "w-4 h-4 mt-0.5 shrink-0",
                        color,
                        activity.status === "running" && "animate-spin"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{activity.action}</p>
                        {activity.details && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {activity.details}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {activity.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
