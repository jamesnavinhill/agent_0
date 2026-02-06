"use client"

import { useCallback, useEffect, useState } from "react"
import { useAgentStore } from "@/lib/store/agent-store"
import { useAgentChat } from "@/hooks/use-agent-chat"
import { NavRail } from "@/components/navigation/nav-rail"
import { ChatPanel } from "@/components/panels/chat-panel"
import { ThoughtsPanel } from "@/components/panels/thoughts-panel"
import { GalleryPanel } from "@/components/panels/gallery-panel"
import { SettingsPanel } from "@/components/panels/settings-panel"
import { MonitorPanel } from "@/components/panels/monitor-panel"
import { SchedulePanel } from "@/components/panels/schedule-panel"
import { MemoryPanel } from "@/components/panels/memory-panel"
import { SubAgentsPanel } from "@/components/panels/sub-agents-panel"
import { SandboxPanel } from "@/components/panels/sandbox-panel"
import { MultimodalInput } from "@/components/input/multimodal-input"
import { StatusBar } from "@/components/agent/status-bar"
import { DemoInitializer } from "@/components/demo/demo-initializer"
import { cn } from "@/lib/utils"
import { PanelErrorBoundary } from "@/components/error-boundary"

export default function AgentInterface() {
  const [mobileThoughtsOpen, setMobileThoughtsOpen] = useState(false)

  const {
    activePanel,
    sidebarOpen,
    setSidebarOpen,
    fetchGallery,
    fetchTasks,
    fetchGoals
  } = useAgentStore()

  // Initial data fetch
  useEffect(() => {
    fetchGallery()
    fetchTasks()
    fetchGoals()
  }, [fetchGallery, fetchTasks, fetchGoals])

  useEffect(() => {
    if (activePanel !== "chat") {
      setMobileThoughtsOpen(false)
    }
  }, [activePanel])

  const { sendMessage, isLoading } = useAgentChat()

  const toggleThoughtsPanel = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileThoughtsOpen((open) => !open)
      return
    }
    setSidebarOpen(!sidebarOpen)
  }, [sidebarOpen, setSidebarOpen])

  const closeThoughtsPanel = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileThoughtsOpen(false)
      return
    }
    setSidebarOpen(false)
  }, [setSidebarOpen])

  const handleSend = useCallback(async (message: string, files?: File[]) => {
    if (!message.trim() && !files?.length) return
    sendMessage(message)
  }, [sendMessage])

  const renderMainPanel = () => {
    const panelName = activePanel.charAt(0).toUpperCase() + activePanel.slice(1)

    const panel = (() => {
      switch (activePanel) {
        case "chat":
          return (
            <ChatPanel
              thoughtsOpen={sidebarOpen || mobileThoughtsOpen}
              onToggleThoughts={toggleThoughtsPanel}
            />
          )
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
        case "sandbox":
          return <SandboxPanel />
        default:
          return (
            <ChatPanel
              thoughtsOpen={sidebarOpen || mobileThoughtsOpen}
              onToggleThoughts={toggleThoughtsPanel}
            />
          )
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
          <ThoughtsPanel onClose={closeThoughtsPanel} />
        </PanelErrorBoundary>
      )
    }
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "true" && <DemoInitializer />}

      <div className="flex flex-1 min-h-0">
        <NavRail />

        <div className="flex-1 flex flex-col min-w-0">
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

      {activePanel === "chat" && mobileThoughtsOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
          onClick={() => setMobileThoughtsOpen(false)}
        >
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-sm bg-background border-l border-border"
            onClick={(event) => event.stopPropagation()}
          >
            {renderSecondaryPanel()}
          </aside>
        </div>
      )}

      <StatusBar />
    </div>
  )
}
