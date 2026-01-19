"use client"

import { useCallback } from "react"
import { useAgentStore } from "@/lib/store/agent-store"
import { useAgentChat } from "@/hooks/use-agent-chat"
import { NavRail } from "@/components/navigation/nav-rail"
import { ChatPanel } from "@/components/panels/chat-panel"
import { ThoughtsPanel } from "@/components/panels/thoughts-panel"
import { ActivityPanel } from "@/components/panels/activity-panel"
import { GalleryPanel } from "@/components/panels/gallery-panel"
import { SettingsPanel } from "@/components/panels/settings-panel"
import { MonitorPanel } from "@/components/panels/monitor-panel"
import { SchedulePanel } from "@/components/panels/schedule-panel"
import { MemoryPanel } from "@/components/panels/memory-panel"
import { CreatePanel } from "@/components/panels/create-panel"
import { SubAgentsPanel } from "@/components/panels/sub-agents-panel"
import { MultimodalInput } from "@/components/input/multimodal-input"
import { StatusBar } from "@/components/agent/status-bar"
import { DemoInitializer } from "@/components/demo/demo-initializer"
import { cn } from "@/lib/utils"
import { PanelLeftClose, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PanelErrorBoundary } from "@/components/error-boundary"

export default function AgentInterface() {
  const {
    activePanel,
    sidebarOpen,
    setSidebarOpen,
    state,
  } = useAgentStore()

  const { sendMessage, status, isLoading } = useAgentChat()

  const handleSend = useCallback(async (message: string, files?: File[]) => {
    if (!message.trim() && !files?.length) return
    sendMessage(message)
  }, [sendMessage])

  const renderMainPanel = () => {
    const panelName = activePanel.charAt(0).toUpperCase() + activePanel.slice(1)

    const panel = (() => {
      switch (activePanel) {
        case "chat":
          return <ChatPanel />
        case "create":
          return <CreatePanel />
        case "thoughts":
          return <ThoughtsPanel />
        case "activity":
          return <ActivityPanel />
        case "gallery":
          return <GalleryPanel />
        case "subagents":
          return <SubAgentsPanel />
        case "monitor":
          return <MonitorPanel />
        case "schedule":
          return <SchedulePanel />
        case "memory":
          return <MemoryPanel />
        case "settings":
          return <SettingsPanel />
        default:
          return <ChatPanel />
      }
    })()

    return (
      <PanelErrorBoundary name={`${panelName} Panel`}>
        {panel}
      </PanelErrorBoundary>
    )
  }

  const renderSecondaryPanel = () => {
    if (activePanel === "chat") {
      return (
        <PanelErrorBoundary name="Thoughts Panel">
          <ThoughtsPanel />
        </PanelErrorBoundary>
      )
    }
    return null
  }

  const getStatusLabel = () => {
    if (state === "error") return "Error"
    if (status === "streaming") return "Responding"
    if (status === "loading") return "Thinking"
    return "Ready"
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <DemoInitializer />

      <div className="flex flex-1 min-h-0">
        <NavRail />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-surface-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden w-8 h-8"
              >
                {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              </Button>
              <h1 className="text-sm font-medium">Agent Zero</h1>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Autonomous AI Interface
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors",
                state === "error"
                  ? "bg-destructive"
                  : isLoading
                    ? "bg-accent animate-pulse"
                    : "bg-muted"
              )} />
              <span className="text-xs text-muted-foreground">
                {getStatusLabel()}
              </span>
            </div>
          </header>

          <div className="flex-1 flex min-h-0">
            <main className={cn(
              "flex-1 flex flex-col min-w-0",
              activePanel === "chat" && sidebarOpen && "lg:flex-[2]"
            )}>
              <div className="flex-1 overflow-hidden">
                {renderMainPanel()}
              </div>

              {activePanel === "chat" && (
                <MultimodalInput
                  onSend={handleSend}
                  disabled={isLoading}
                />
              )}
            </main>

            {activePanel === "chat" && sidebarOpen && (
              <aside className="hidden lg:flex lg:flex-1 flex-col min-w-0 max-w-sm border-l border-border">
                {renderSecondaryPanel()}
              </aside>
            )}
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  )
}
