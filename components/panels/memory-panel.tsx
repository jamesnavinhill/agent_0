"use client"

import React from "react"

import { useState, useMemo } from "react"
import { useAgentStore } from "@/lib/store/agent-store"
import { useMemory } from "@/hooks/use-memory"
import type { MemoryLayer } from "@/lib/memory"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  Brain,
  Search,
  Database,
  Layers,
  Clock,
  Bookmark,
  FileText,
  Link,
  Trash2,
  ChevronRight,
  Sparkles,
  Zap,
  Archive,
  RefreshCw,
  HardDrive,
  Cpu,
  MemoryStick,
  Download,
  SortAsc,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type MemoryType = "all" | "shortTerm" | "longTerm" | "episodic" | "semantic" | "files"

interface MemoryItem {
  id: string
  type: "shortTerm" | "longTerm" | "episodic" | "semantic" | "file"
  content: string
  metadata: {
    timestamp: Date
    source?: string
    relevance?: number
    accessCount?: number
    tags?: string[]
  }
}



export function MemoryPanel() {
  const { memory } = useAgentStore()
  const { memories: storeMemories, knowledge, stats, loading, remove, clear, refresh, exportToJSON } = useMemory()
  const [filter, setFilter] = useState<MemoryType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedSection, setExpandedSection] = useState<string | null>("memories")

  // Use real stats from hook if available, or calculate
  // The hook returns { total: number, byLayer: Record<MemoryLayer, number> }
  // We need to map it to the UI format
  const memoryStats = useMemo(() => ({
    shortTerm: { used: stats.byLayer.shortTerm || 0, total: 1000, label: "Short-term" },
    longTerm: { used: stats.byLayer.longTerm || 0, total: 10000, label: "Long-term" },
    episodic: { used: stats.byLayer.episodic || 0, total: 500, label: "Episodic" },
    semantic: { used: stats.byLayer.semantic || 0, total: 1000, label: "Semantic" },
    files: { used: 0, total: 100, label: "Files" }, // TODO: Add files to stats
  }), [stats])

  // Transform store memories to panel format
  const memories: MemoryItem[] = useMemo(() => storeMemories.map((m) => ({
    id: m.id,
    type: m.layer === "shortTerm" ? "shortTerm" : m.layer === "longTerm" ? "longTerm" : m.layer === "episodic" ? "episodic" : m.layer === "semantic" ? "semantic" : "shortTerm",
    content: m.content,
    metadata: {
      timestamp: new Date(m.timestamp), // Ensure date object
      source: m.metadata?.source,
      relevance: m.metadata?.relevance,
      accessCount: m.metadata?.accessCount,
      tags: m.metadata?.tags,
    }
  })), [storeMemories])

  const filteredMemories = memories.filter((m) => {
    if (filter !== "all" && filter !== "files" && m.type !== filter) return false
    if (filter === "files" && m.type !== "file") return false
    if (searchQuery && !m.content.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const handleDelete = async (id: string) => {
    await remove(id)
  }

  const handleClear = async (layer?: MemoryLayer) => {
    await clear(layer)
  }

  const getTypeIcon = (type: MemoryItem["type"]) => {
    switch (type) {
      case "shortTerm": return <Zap className="w-3.5 h-3.5" />
      case "longTerm": return <Database className="w-3.5 h-3.5" />
      case "episodic": return <Clock className="w-3.5 h-3.5" />
      case "semantic": return <Link className="w-3.5 h-3.5" />
      case "file": return <FileText className="w-3.5 h-3.5" />
    }
  }

  const getTypeColor = (type: MemoryItem["type"]) => {
    switch (type) {
      case "shortTerm": return "text-yellow-500"
      case "longTerm": return "text-blue-500"
      case "episodic": return "text-purple-500"
      case "semantic": return "text-green-500"
      case "file": return "text-orange-500"
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search and Filter */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            className="pl-9 h-8 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {(["all", "shortTerm", "longTerm", "episodic", "semantic", "files"] as MemoryType[]).map((type) => (
            <Button
              key={type}
              variant={filter === type ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-[10px] shrink-0"
              onClick={() => setFilter(type)}
            >
              {type === "all" ? "All" : type === "shortTerm" ? "Short" : type === "longTerm" ? "Long" : type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {/* Context Window Section */}
          <CollapsibleSection
            title="Context Window"
            icon={<Cpu className="w-4 h-4" />}
            badge={`${memory.contextUsed}/${memory.contextWindow}`}
            expanded={expandedSection === "context"}
            onToggle={() => setExpandedSection(expandedSection === "context" ? null : "context")}
          >
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Token Usage</span>
                  <span>{Math.round((memory.contextUsed / memory.contextWindow) * 100)}%</span>
                </div>
                <Progress value={(memory.contextUsed / memory.contextWindow) * 100} className="h-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-surface-1">
                  <p className="text-muted-foreground">System</p>
                  <p className="font-medium">{Math.round(memory.contextWindow * 0.15).toLocaleString()}</p>
                </div>
                <div className="p-2 rounded bg-surface-1">
                  <p className="text-muted-foreground">Conversation</p>
                  <p className="font-medium">{Math.round(memory.contextWindow * 0.45).toLocaleString()}</p>
                </div>
                <div className="p-2 rounded bg-surface-1">
                  <p className="text-muted-foreground">Memory</p>
                  <p className="font-medium">{Math.round(memory.contextWindow * 0.25).toLocaleString()}</p>
                </div>
                <div className="p-2 rounded bg-surface-1">
                  <p className="text-muted-foreground">Available</p>
                  <p className="font-medium text-accent">{Math.round(memory.contextWindow * 0.15).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Memory Layers Section */}
          <CollapsibleSection
            title="Memory Layers"
            icon={<Layers className="w-4 h-4" />}
            badge={`${memory.totalMemories} items`}
            expanded={expandedSection === "layers"}
            onToggle={() => setExpandedSection(expandedSection === "layers" ? null : "layers")}
          >
            <div className="space-y-2">
              {Object.entries(memoryStats).map(([key, stat]) => (
                <MemoryLayerBar
                  key={key}
                  label={stat.label}
                  used={stat.used}
                  total={stat.total}
                  type={key as MemoryType}
                />
              ))}
            </div>
          </CollapsibleSection>


          {/* Memories Section */}
          <CollapsibleSection
            title="Memories"
            icon={<Brain className="w-4 h-4" />}
            badge={`${filteredMemories.length} items`}
            expanded={expandedSection === "memories"}
            onToggle={() => setExpandedSection(expandedSection === "memories" ? null : "memories")}
          >
            <div className="space-y-1">
              {/* Sort/Action buttons could be moved here or kept simple to match other sections */}
              {/* For now, we will just list the items to be "uniform to the others" */}
              {filteredMemories.map((item) => (
                <MemoryCard
                  key={item.id}
                  item={item}
                  icon={getTypeIcon(item.type)}
                  iconColor={getTypeColor(item.type)}
                />
              ))}
              {filteredMemories.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  {searchQuery ? "No memories match your search" : "No memories in this category"}
                </p>
              )}
            </div>
          </CollapsibleSection>

          {/* Knowledge Base */}
          <CollapsibleSection
            title="Knowledge Base"
            icon={<Archive className="w-4 h-4" />}
            badge={`${knowledge.length} sources`}
            expanded={expandedSection === "knowledge"}
            onToggle={() => setExpandedSection(expandedSection === "knowledge" ? null : "knowledge")}
          >
            <div className="space-y-1">
              {knowledge.length > 0 ? (
                knowledge.map((k: any) => (
                  <div key={k.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface-1">
                    <Database className="w-4 h-4 text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{k.title}</p>
                      <a href={k.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:underline truncate block">
                        {k.url || "No URL"}
                      </a>
                    </div>
                    <Badge variant="outline" className="text-[9px]">
                      {k.tags?.[0] || "research"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">No knowledge items found.</p>
              )}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-2 h-7 text-xs bg-transparent">
              Add Knowledge Source
            </Button>
          </CollapsibleSection>
        </div>
      </ScrollArea>

      {/* Memory Stats Footer */}
      <div className="p-3 border-t border-border bg-surface-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <MemoryStick className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Total:</span>
              <span>{stats.total} items</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={exportToJSON}>
              <Download className="w-3 h-3" />
              Export
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={refresh}>
              <RefreshCw className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-destructive hover:text-destructive"
              onClick={() => handleClear()}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CollapsibleSection({
  title,
  icon,
  badge,
  expanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  badge?: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border overflow-hidden">
      <button
        className="w-full flex items-center gap-2 p-3 hover:bg-accent-subtle transition-colors"
        onClick={onToggle}
      >
        <span className="text-accent">{icon}</span>
        <span className="text-sm font-medium flex-1 text-left">{title}</span>
        {badge && (
          <Badge variant="secondary" className="h-5 text-[10px]">
            {badge}
          </Badge>
        )}
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
      </button>
      {expanded && <div className="px-3 pb-3 border-t border-border pt-3">{children}</div>}
    </section>
  )
}

function MemoryLayerBar({
  label,
  used,
  total,
  type,
}: {
  label: string
  used: number
  total: number
  type: MemoryType
}) {
  const percentage = (used / total) * 100

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-16">{label}</span>
      <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percentage > 80 ? "bg-red-500" : percentage > 60 ? "bg-yellow-500" : "bg-accent"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-12 text-right">
        {used}/{total}
      </span>
    </div>
  )
}

function MemoryCard({
  item,
  icon,
  iconColor,
}: {
  item: MemoryItem
  icon: React.ReactNode
  iconColor: string
}) {
  return (
    <div className="group flex items-start gap-2 p-2 rounded-lg hover:bg-accent-subtle transition-colors">
      <div className={cn("mt-0.5 shrink-0", iconColor)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{item.content}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">
            {formatTimeAgo(item.metadata.timestamp)}
          </span>
          {item.metadata.relevance && (
            <Badge variant="outline" className="h-4 text-[9px] px-1">
              {Math.round(item.metadata.relevance * 100)}% relevant
            </Badge>
          )}
          {item.metadata.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="h-4 text-[9px] px-1">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Bookmark className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pin memory</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

function KnowledgeSourceCard({
  name,
  count,
  size,
  synced,
}: {
  name: string
  count: number
  size: string
  synced: Date
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-1">
      <Database className="w-4 h-4 text-accent shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-[10px] text-muted-foreground">
          {count} items · {size} · Synced {formatTimeAgo(synced)}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Re-sync
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            Re-embed
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  if (!date || isNaN(date.getTime())) return "Unknown"
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
