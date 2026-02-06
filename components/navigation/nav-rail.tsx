"use client"

import { useAgentStore } from "@/lib/store/agent-store"
import { cn } from "@/lib/utils"
import {
  MessageSquare,
  ImageIcon,
  Settings,
  Calendar,
  Database,
  Radio,
  Sparkles,
  Users,
  Code2,
} from "lucide-react"
import { AgentOrb } from "@/components/agent/agent-orb"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navItems = [
  { id: "chat" as const, icon: MessageSquare, label: "Chat" },
  { id: "create" as const, icon: Sparkles, label: "Create" },
  { id: "subagents" as const, icon: Users, label: "Sub-Agents" },
  { id: "gallery" as const, icon: ImageIcon, label: "Gallery" },
  { id: "monitor" as const, icon: Radio, label: "Live Monitor" },
  { id: "sandbox" as const, icon: Code2, label: "Sandbox" },
]

const bottomItems = [
  { id: "schedule" as const, icon: Calendar, label: "Schedule" },
  { id: "memory" as const, icon: Database, label: "Memory" },
  { id: "settings" as const, icon: Settings, label: "Settings" },
]

export function NavRail() {
  const { activePanel, setActivePanel } = useAgentStore()

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="flex flex-col items-center h-full py-4 px-2 bg-surface-1 border-r border-border">
        {/* Agent Orb at top */}
        <div className="mb-6">
          <AgentOrb size="sm" showLabel={false} />
        </div>

        {/* Main nav items */}
        <div className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActivePanel(item.id)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    "transition-all duration-200",
                    "hover:bg-accent/10 hover:text-accent",
                    activePanel === item.id
                      ? "bg-accent/15 text-accent shadow-[0_0_10px_var(--accent-glow)]"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Bottom items */}
        <div className="flex flex-col gap-1 mt-auto">
          {bottomItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActivePanel(item.id)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    "transition-all duration-200",
                    "hover:bg-accent/10 hover:text-accent",
                    activePanel === item.id
                      ? "bg-accent/15 text-accent shadow-[0_0_10px_var(--accent-glow)]"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </nav>
    </TooltipProvider>
  )
}
