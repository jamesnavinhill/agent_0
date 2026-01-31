"use client"

import { useState, useEffect, useRef } from "react"
import { useAgentStore } from "@/lib/store/agent-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Monitor,
  Terminal,
  Globe,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Radio,
  Users,
  Wifi,
  WifiOff,
  Play,
  Pause,
  RotateCcw,
  Camera,
  Share2,
} from "lucide-react"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  subscribeActivity,
  getRecentActivities,
  type ActivityEvent,
  type ActivityLevel,
} from "@/lib/activity/bus"

type MonitorView = "browser" | "terminal" | "split"

interface TerminalLine {
  id: string
  timestamp: Date
  type: "input" | "output" | "error" | "system"
  content: string
}

/**
 * Map activity level to terminal line type
 */
function levelToTerminalType(level?: ActivityLevel): TerminalLine["type"] {
  switch (level) {
    case "action":
      return "input"
    case "error":
      return "error"
    case "thought":
    case "debug":
      return "system"
    default:
      return "output"
  }
}

/**
 * Convert ActivityEvent to TerminalLine format
 */
function activityToTerminalLine(event: ActivityEvent): TerminalLine {
  const prefix = event.source ? `[${event.source}] ` : ""
  const content = event.level === "action"
    ? `$ ${event.action}`
    : `${prefix}${event.action}${event.details ? `: ${event.details}` : ""}`

  return {
    id: event.id ?? crypto.randomUUID(),
    timestamp: new Date(event.timestamp ?? Date.now()),
    type: levelToTerminalType(event.level),
    content,
  }
}

export function MonitorPanel() {
  const { state } = useAgentStore()
  const [view, setView] = useState<MonitorView>("split")
  const [isLive, setIsLive] = useState(true)
  const [isPublic, setIsPublic] = useState(false)
  const [viewerCount] = useState(12)
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([])
  const [latestSnapshot, setLatestSnapshot] = useState<{ url: string; title?: string } | null>(null)
  const [inputValue, setInputValue] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)

  // Poll activity logs from API
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const fetchActivities = async () => {
      try {
        const res = await fetch("/api/activity?limit=50")
        if (!res.ok) throw new Error("Failed to fetch")
        const activities: ActivityEvent[] = await res.json()

        if (mounted) {
          // Merge with local input lines if needed, or just display activities
          // Ideally we should merge based on timestamps
          const fetchedLines = activities.map(activityToTerminalLine)
          
          setTerminalLines(prev => {
             // specific logic to keep local input lines if they are not in fetched (simplified for now: just replace)
             // A better real app would merge lists
             return fetchedLines
          })

          // Find latest activity with an image
          const snapshotActivity = activities.find(a => a.imageUrl)
          if (snapshotActivity && snapshotActivity.imageUrl) {
            setLatestSnapshot({
              url: snapshotActivity.imageUrl,
              title: snapshotActivity.details
            })
          }
        }
      } catch (err) {
        console.error("Polling error:", err)
      } finally {
        if (mounted && isLive) {
          timeoutId = setTimeout(fetchActivities, 2000)
        }
      }
    }

    if (isLive) {
      fetchActivities()
    }

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [isLive])

  // Handle scroll events to detect user scroll
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      shouldAutoScrollRef.current = isAtBottom
    }

    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [view]) // Re-attach when view changes

  // Auto-scroll to bottom when new lines added
  useEffect(() => {
    if (scrollRef.current && isLive && shouldAutoScrollRef.current) {
      // Small timeout to ensure DOM is updated
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 0)
    }
  }, [terminalLines, isLive])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      const newLine: TerminalLine = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        type: "input",
        content: inputValue
      }
      // Optimistic update
      setTerminalLines(prev => [...prev, newLine])
      
      // Here you would typically send command to agent
      // For now, we simulate a system response
      setTimeout(() => {
        setTerminalLines(prev => [...prev, {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          type: "system",
          content: `Command execution not available in preview mode.`
        }])
      }, 500)

      setInputValue("")
    }
  }

  const isConnected = state !== "error"

  return (
    <div className="h-full flex flex-col">
      {/* Monitor Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isLive ? (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-xs font-medium text-red-500">LIVE</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">PAUSED</span>
            )}
          </div>

          {isPublic && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs">{viewerCount} watching</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsLive(!isLive)}
                >
                  {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isLive ? "Pause feed" : "Resume feed"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsPublic(!isPublic)}
                >
                  {isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPublic ? "Make private" : "Make public"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Camera className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Screenshot</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share stream</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-surface-1">
        <Button
          variant={view === "browser" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => setView("browser")}
        >
          <Globe className="w-3.5 h-3.5" />
          Browser
        </Button>
        <Button
          variant={view === "terminal" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => setView("terminal")}
        >
          <Terminal className="w-3.5 h-3.5" />
          Terminal
        </Button>
        <Button
          variant={view === "split" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => setView("split")}
        >
          <Monitor className="w-3.5 h-3.5" />
          Split
        </Button>
      </div>

      {/* Monitor Content */}
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {(view === "browser" || view === "split") && (
            <ResizablePanel 
              defaultSize={view === "split" ? 50 : 100} 
              minSize={20}
              className={cn("flex flex-col", view === "split" ? "border-r border-border" : "")}
            >
            {/* Browser Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 border-b border-border">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 flex items-center gap-2 px-2 py-1 rounded bg-surface-1 text-xs text-muted-foreground">
                <Globe className="w-3 h-3" />
                <span className="truncate">https://arxiv.org/search/?query=emergent+AI+behavior</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>

            {/* Browser View */}
            <div className="flex-1 bg-surface-0 flex items-center justify-center relative overflow-hidden bg-zinc-950">
              {latestSnapshot ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={latestSnapshot.url}
                    alt="Browser Snapshot"
                    className="max-w-full max-h-full object-contain"
                  />
                  <div className="absolute bottom-4 bg-background/80 backdrop-blur px-3 py-1 rounded text-xs border border-border">
                    {latestSnapshot.title || "Browser Snapshot"}
                  </div>
                </div>
              ) : isConnected ? (
                <div className="flex-1 w-full flex flex-col items-center justify-center text-muted-foreground p-4">
                  <div className="w-full max-w-md space-y-4">
                    {/* Mock browser content */}
                    <div className="h-8 bg-zinc-800 rounded animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 bg-zinc-800 rounded w-3/4 animate-pulse" />
                      <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                      <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="h-20 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-20 bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-zinc-800 rounded w-2/3 animate-pulse" />
                      <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                    </div>
                  </div>
                  <p className="text-xs mt-4 text-center">Waiting for browser activity...</p>
                </div>
              ) : (
                <div className="text-center">
                  <WifiOff className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Browser disconnected</p>
                </div>
              )}
            </div>
            </ResizablePanel>
          )}

          {view === "split" && <ResizableHandle withHandle />}

          {(view === "terminal" || view === "split") && (
            <ResizablePanel defaultSize={view === "split" ? 50 : 100} minSize={20} className="flex flex-col bg-[#0d0d0d] overflow-hidden">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a1a] border-b border-[#333]">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs text-zinc-400 font-mono">agent@zero:~</span>
              </div>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Badge variant="outline" className="h-5 text-[10px] border-green-500/30 text-green-500 gap-1">
                    <Wifi className="w-2.5 h-2.5" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="h-5 text-[10px] border-red-500/30 text-red-500 gap-1">
                    <WifiOff className="w-2.5 h-2.5" />
                    Disconnected
                  </Badge>
                )}
              </div>
            </div>

            {/* Terminal Content */}
            <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
              <div className="p-3 font-mono text-xs space-y-1">
                {terminalLines.map((line) => (
                  <div key={line.id} className="flex gap-2">
                    <span className="text-zinc-600 shrink-0">
                      {line.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span
                      className={cn(
                        line.type === "input" && "text-accent",
                        line.type === "output" && "text-zinc-300",
                        line.type === "error" && "text-red-400",
                        line.type === "system" && "text-zinc-500 italic"
                      )}
                    >
                      {line.content}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Terminal Input */}
            <div className="flex items-center gap-2 px-3 py-2 border-t border-[#333] bg-[#1a1a1a]">
              <span className="text-accent font-mono text-xs">$</span>
              <input
                type="text"
                placeholder="Enter command..."
                className="flex-1 bg-transparent text-xs font-mono text-zinc-300 placeholder:text-zinc-600 outline-none"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Connection Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-surface-1 text-xs">
        <div className="flex items-center gap-4">
          <StatusIndicator label="Gemini" connected />
          <StatusIndicator label="Browser" connected />
          <StatusIndicator label="CLI" connected />
          <StatusIndicator label="Files" connected />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Radio className="w-3 h-3" />
          <span>Stream: 720p @ 30fps</span>
        </div>
      </div>
    </div>
  )
}

function StatusIndicator({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-1.5 h-1.5 rounded-full", connected ? "bg-green-500" : "bg-red-500")} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}
