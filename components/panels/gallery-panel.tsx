"use client"

import React from "react"

import { useState } from "react"
import { useAgentStore, type AgentOutput } from "@/lib/store/agent-store"
import { cn } from "@/lib/utils"
import { downloadImage, downloadFile, copyToClipboard, sanitizeFilename } from "@/lib/utils/export-utils"
import {
  Palette,
  Music,
  Code,
  BookOpen,
  FlaskConical,
  Newspaper,
  Gamepad2,
  Compass,
  Grid3X3,
  List,
  Download,
  Copy,
  Check,
  FileDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const categoryConfig: Record<AgentOutput["category"], { icon: React.ElementType; label: string; color: string }> = {
  art: { icon: Palette, label: "Art Gallery", color: "text-pink-400 bg-pink-400/10" },
  music: { icon: Music, label: "Music Studio", color: "text-purple-400 bg-purple-400/10" },
  code: { icon: Code, label: "Code Lab", color: "text-green-400 bg-green-400/10" },
  philosophy: { icon: BookOpen, label: "Philosophy", color: "text-amber-400 bg-amber-400/10" },
  research: { icon: FlaskConical, label: "Research", color: "text-blue-400 bg-blue-400/10" },
  blog: { icon: Newspaper, label: "Blog", color: "text-orange-400 bg-orange-400/10" },
  game: { icon: Gamepad2, label: "Games", color: "text-red-400 bg-red-400/10" },
}

type ViewMode = "grid" | "list"

export function GalleryPanel() {
  const { outputs } = useAgentStore()
  const [selectedCategory, setSelectedCategory] = useState<AgentOutput["category"] | "all">("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [selectedOutput, setSelectedOutput] = useState<AgentOutput | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopy = async (content: string) => {
    const success = await copyToClipboard(content)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = async (output: AgentOutput) => {
    const filename = sanitizeFilename(output.title || output.category) || "download"

    if (output.type === "image") {
      await downloadImage(output.content, `${filename}.png`)
    } else if (output.type === "code") {
      downloadFile(`${filename}.txt`, output.content, "text/plain")
    } else {
      downloadFile(`${filename}.txt`, output.content, "text/plain")
    }
  }

  const exportAllOutputs = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      outputs: outputs.map(o => ({
        ...o,
        timestamp: o.timestamp.toISOString()
      }))
    }
    downloadFile(`agent-zero-gallery-${new Date().toISOString().split("T")[0]}.json`, JSON.stringify(data, null, 2), "application/json")
  }

  const filteredOutputs = selectedCategory === "all"
    ? outputs
    : outputs.filter((o) => o.category === selectedCategory)

  const categories = Object.keys(categoryConfig) as AgentOutput["category"][]
  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = outputs.filter((o) => o.category === cat).length
    return acc
  }, {} as Record<AgentOutput["category"], number>)

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters */}
      <div className="px-4 py-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Creations</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={exportAllOutputs}
              className="w-8 h-8"
              title="Export all"
            >
              <FileDown className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={cn("w-8 h-8", viewMode === "grid" && "bg-surface-2")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("list")}
              className={cn("w-8 h-8", viewMode === "list" && "bg-surface-2")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
              selectedCategory === "all"
                ? "bg-accent text-accent-foreground"
                : "bg-surface-2 text-muted-foreground hover:text-foreground"
            )}
          >
            All ({outputs.length})
          </button>
          {categories.map((cat) => {
            const config = categoryConfig[cat]
            const count = categoryCounts[cat]
            if (count === 0) return null
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5",
                  selectedCategory === cat
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface-2 text-muted-foreground hover:text-foreground"
                )}
              >
                <config.icon className="w-3 h-3" />
                {config.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Gallery content */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredOutputs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Palette className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No creations yet</p>
            <p className="text-xs mt-1">Agent outputs will appear here</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredOutputs.map((output) => {
              const config = categoryConfig[output.category]
              return (
                <button
                  key={output.id}
                  onClick={() => setSelectedOutput(output)}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-surface-2 hover:ring-2 hover:ring-accent/50 transition-all"
                >
                  {output.type === "image" ? (
                    <img
                      src={output.content || "/placeholder.svg"}
                      alt={output.title || "Generated image"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                      <config.icon className={cn("w-8 h-8 mb-2", config.color.split(" ")[0])} />
                      <p className="text-xs text-center line-clamp-3 text-muted-foreground">
                        {output.title || output.content.slice(0, 100)}
                      </p>
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-xs text-white truncate">
                      {output.title || output.category}
                    </span>
                  </div>

                  {/* Category badge */}
                  <div className={cn(
                    "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center",
                    config.color
                  )}>
                    <config.icon className="w-3 h-3" />
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOutputs.map((output) => {
              const config = categoryConfig[output.category]
              return (
                <button
                  key={output.id}
                  onClick={() => setSelectedOutput(output)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors text-left"
                >
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", config.color)}>
                    <config.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {output.title || output.category}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {output.content.slice(0, 80)}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {output.timestamp.toLocaleDateString()}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedOutput} onOpenChange={() => setSelectedOutput(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedOutput && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const config = categoryConfig[selectedOutput.category]
                    return (
                      <>
                        <div className={cn("w-6 h-6 rounded flex items-center justify-center", config.color)}>
                          <config.icon className="w-4 h-4" />
                        </div>
                        {selectedOutput.title || selectedOutput.category}
                      </>
                    )
                  })()}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedOutput.type === "image" && (
                  <img
                    src={selectedOutput.content || "/placeholder.svg"}
                    alt={selectedOutput.title || "Generated image"}
                    className="w-full rounded-lg"
                  />
                )}
                {selectedOutput.type === "code" && (
                  <pre className="p-4 bg-surface-1 rounded-lg overflow-x-auto text-sm font-mono">
                    <code>{selectedOutput.content}</code>
                  </pre>
                )}
                {(selectedOutput.type === "text" || selectedOutput.type === "audio" || selectedOutput.type === "video") && (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{selectedOutput.content}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    Created: {selectedOutput.timestamp.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(selectedOutput.content)}
                      className="gap-1"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(selectedOutput)}
                      className="gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
