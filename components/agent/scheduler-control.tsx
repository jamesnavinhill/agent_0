"use client"

import { useScheduler } from "@/hooks/use-scheduler"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  Play, 
  Pause, 
  Clock, 
  Zap,
  Loader2,
} from "lucide-react"
import { useAutonomy } from "@/hooks/use-autonomy"

export function SchedulerControl() {
  const { isRunning, lastCheck, currentExecution, toggle } = useScheduler()
  const { toggle: toggleOrch, orchestrator } = useAutonomy()
  const orchRunning = orchestrator?.isRunning ?? false

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isRunning ? "secondary" : "outline"}
        size="sm"
        className={cn(
          "h-7 text-xs gap-1.5 transition-all",
          isRunning && "bg-accent/20 border-accent/50"
        )}
        onClick={toggle}
      >
        {currentExecution ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">Running Task...</span>
          </>
        ) : isRunning ? (
          <>
            <Pause className="w-3 h-3" />
            <span className="hidden sm:inline">Pause</span>
          </>
        ) : (
          <>
            <Play className="w-3 h-3" />
            <span className="hidden sm:inline">Start Autonomy</span>
          </>
        )}
      </Button>
      <Button
        variant={orchRunning ? "secondary" : "outline"}
        size="sm"
        className={cn(
          "h-7 text-xs gap-1.5 transition-all",
          orchRunning && "bg-accent/20 border-accent/50"
        )}
        onClick={toggleOrch}
      >
        {orchRunning ? (
          <>
            <Pause className="w-3 h-3" />
            <span className="hidden sm:inline">Stop Creator</span>
          </>
        ) : (
          <>
            <Play className="w-3 h-3" />
            <span className="hidden sm:inline">Start Creator</span>
          </>
        )}
      </Button>
      
      {isRunning && (
        <Badge 
          variant="outline" 
          className="h-6 text-[10px] gap-1 bg-accent/10 border-accent/30"
        >
          <Zap className="w-2.5 h-2.5 text-accent" />
          Autonomous
        </Badge>
      )}
      
      {lastCheck && !currentExecution && (
        <span className="text-[10px] text-muted-foreground hidden md:flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          Checked {formatTimeAgo(lastCheck)}
        </span>
      )}
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  
  if (seconds < 60) return "just now"
  if (seconds < 120) return "1 min ago"
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`
  
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}
