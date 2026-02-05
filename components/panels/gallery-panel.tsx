"use client"

import React, { useEffect } from "react"

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
  ChevronRight,
  ArrowLeft,
  Filter,
  Layers
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

const categoryConfig: Record<AgentOutput["category"], { icon: React.ElementType; label: string; color: string; description: string }> = {
  art: { icon: Palette, label: "Art Gallery", color: "text-pink-400 bg-pink-400/10", description: "Generated images and artwork" },
  music: { icon: Music, label: "Music Studio", color: "text-purple-400 bg-purple-400/10", description: "Audio compositions" },
  code: { icon: Code, label: "Code Lab", color: "text-green-400 bg-green-400/10", description: "Snippets and repositories" },
  philosophy: { icon: BookOpen, label: "Philosophy", color: "text-amber-400 bg-amber-400/10", description: "Reflections and thoughts" },
  research: { icon: FlaskConical, label: "Research", color: "text-blue-400 bg-blue-400/10", description: "Reports and findings" },
  blog: { icon: Newspaper, label: "Blog", color: "text-orange-400 bg-orange-400/10", description: "Articles and posts" },
  game: { icon: Gamepad2, label: "Games", color: "text-red-400 bg-red-400/10", description: "Interactive experiences" },
}

type ViewMode = "grid" | "list"
type NavigationState = "stacks" | "category"

export function GalleryPanel() {
  const { outputs, fetchGallery } = useAgentStore()
  const [navState, setNavState] = useState<NavigationState>("stacks")
  const [selectedCategory, setSelectedCategory] = useState<AgentOutput["category"] | "all">("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [selectedOutput, setSelectedOutput] = useState<AgentOutput | null>(null)
  const [copied, setCopied] = useState(false)

  // Ensure fresh data on mount
  useEffect(() => {
    fetchGallery()
  }, [])

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
    } else if (output.type === "video" || output.type === "audio") {
      const mediaUrl = output.content || output.url
      if (!mediaUrl) return
      try {
        const response = await fetch(mediaUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${filename}.${output.type === "video" ? "mp4" : "mp3"}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error("Failed to download media:", error)
      }
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

  const handleStackClick = (cat: AgentOutput["category"]) => {
    setSelectedCategory(cat)
    setNavState("category")
  }

  const handleBackToStacks = () => {
    setNavState("stacks")
    setSelectedCategory("all")
  }

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border space-y-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground/80">Creations</span>

            {navState === "category" && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs font-normal">
                  {selectedCategory === "all" ? "All" : categoryConfig[selectedCategory].label}
                </Badge>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {navState === "category" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToStacks}
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground mr-2"
              >
                <Layers className="w-4 h-4" />
                <span className="text-xs">Stacks</span>
              </Button>
            )}

            <div className="h-4 w-px bg-border mx-1" />

            <Button
              variant="ghost"
              size="icon"
              onClick={exportAllOutputs}
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
              title="Export all"
            >
              <FileDown className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
              disabled={navState === "stacks"}
              className={cn(
                "w-8 h-8 transition-colors",
                viewMode === "grid" ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground",
                navState === "stacks" && "opacity-30"
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("list")}
              disabled={navState === "stacks"}
              className={cn(
                "w-8 h-8 transition-colors",
                viewMode === "list" ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground",
                navState === "stacks" && "opacity-30"
              )}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {navState === "stacks" ? (
          // STACKS VIEW
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const config = categoryConfig[cat]
              const count = categoryCounts[cat]
              // if (count === 0) return null // Optional: hide empty stacks

              // Get top 3 items for preview
              const previewItems = outputs.filter(o => o.category === cat).slice(0, 3)

              return (
                <button
                  key={cat}
                  onClick={() => handleStackClick(cat)}
                  className="group relative flex flex-col items-start p-6 rounded-xl border border-border/50 bg-surface-1 hover:bg-surface-2 hover:border-accent/50 transition-all duration-300 text-left h-48 overflow-hidden"
                >
                  <div className="flex items-start justify-between w-full mb-4 z-10">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-colors", config.color, "group-hover:bg-accent group-hover:text-accent-foreground")}>
                      <config.icon className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="bg-background/50 backdrop-blur-sm border-border/50">
                      {count} items
                    </Badge>
                  </div>

                  <div className="z-10 relative">
                    <h3 className="font-semibold text-lg tracking-tight mb-1 group-hover:text-accent transition-colors">
                      {config.label}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-[90%]">
                      {config.description}
                    </p>
                  </div>

                  {/* Decorative Stack Effect elements */}
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-background/50 to-transparent pointer-events-none" />

                  {/* Preview circles/images could go here in future */}
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-gradient-to-br from-accent/5 to-transparent blur-2xl group-hover:from-accent/10 transition-all" />
                </button>
              )
            })}
          </div>
        ) : (
          // GRID/LIST VIEW of Selected Category
          <>
            {filteredOutputs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground opacity-50">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-surface-2", categoryConfig[selectedCategory as AgentOutput["category"]]?.color)}>
                  <Layers className="w-8 h-8" />
                </div>
                <p className="font-medium">No items in this stack yet</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredOutputs.map((output) => {
                  const config = categoryConfig[output.category]
                  return (
                    <button
                      key={output.id}
                      onClick={() => setSelectedOutput(output)}
                      className="group relative aspect-[4/5] rounded-lg overflow-hidden bg-surface-2 border border-border/50 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all text-left"
                    >
                      {output.type === "image" ? (
                        <img
                          src={output.content || "/placeholder.svg"}
                          alt={output.title || "Generated image"}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : output.type === "video" ? (
                        <video
                          src={output.content || output.url || undefined}
                          className="w-full h-full object-cover"
                          preload="metadata"
                          muted
                          playsInline
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col p-4 relative">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", config.color)}>
                            <config.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-h-0">
                            <h4 className="font-medium text-xs line-clamp-2 mb-1.5 leading-relaxed">
                              {output.title || "Untitled Creation"}
                            </h4>
                            <p className="text-[10px] text-muted-foreground line-clamp-4 leading-relaxed opacity-70">
                              {output.content}
                            </p>
                          </div>

                          {/* Type Badge */}
                          <div className="absolute bottom-2 right-2">
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-background/80 backdrop-blur-sm border-border/50">
                              {output.type}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
                        <span className="text-white text-xs font-medium truncate w-full">
                          {output.title || output.category}
                        </span>
                        <span className="text-white/60 text-[10px]">
                          {new Date(output.timestamp).toLocaleDateString()}
                        </span>
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
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-surface-1 hover:bg-surface-2 hover:border-accent/50 transition-all text-left group"
                    >
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", config.color)}>
                        <config.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate text-foreground group-hover:text-accent transition-colors">
                            {output.title || output.category}
                          </p>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {output.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-2xl">
                          {output.content.replace(/[*#_`]/g, ' ').slice(0, 120)}...
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-muted-foreground block">
                          {new Date(output.timestamp).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50 block">
                          {new Date(output.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail dialog - Made Wider/Larger */}
      <Dialog open={!!selectedOutput} onOpenChange={() => setSelectedOutput(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-border/50 sm:rounded-2xl shadow-2xl">
          {selectedOutput && (
            <DetailContent
              output={selectedOutput}
              onClose={() => setSelectedOutput(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailContent({ output, onClose }: { output: AgentOutput; onClose: () => void }) {
  const [content, setContent] = useState<string>(output.content || "")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (
      !output.content &&
      output.url &&
      (output.type === "text" || output.type === "code" || output.category === "research")
    ) {
      const fetchContent = async () => {
        setLoading(true)
        try {
          const res = await fetch(output.url!)
          if (res.ok) {
            const text = await res.text()
            // If it's a JSON file (legacy), try to parse content
            if (output.url!.endsWith(".json")) {
              try {
                const json = JSON.parse(text)
                setContent(json.content || text)
              } catch {
                setContent(text)
              }
            } else {
              setContent(text)
            }
          }
        } catch (e) {
          console.error("Failed to load content", e)
          setContent("Failed to load content.")
        } finally {
          setLoading(false)
        }
      }
      fetchContent()
    }
  }, [output])

  const handleCopy = async () => {
    const success = await copyToClipboard(content)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = async () => {
    const filename = sanitizeFilename(output.title || output.category) || "download"
    downloadFile(`${filename}.txt`, content, "text/plain")
  }

  const categoryConfigItem = categoryConfig[output.category]

  return (
    <>
      <div className="px-6 py-4 border-b border-border bg-surface-1 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", categoryConfigItem.color)}>
            <categoryConfigItem.icon className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {output.title || "Untitled Creation"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{output.category}</span>
              <span>•</span>
              <span>{new Date(output.timestamp).toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">
            Loading content...
          </div>
        ) : (
          <>
            {output.type === "image" ? (
              <div className="flex justify-center bg-surface-1/50 rounded-xl p-4 border border-border/50">
                <img
                  src={output.content || output.url || "/placeholder.svg"}
                  alt={output.title || "Generated image"}
                  className="max-h-[60vh] object-contain rounded-lg shadow-sm"
                />
              </div>
            ) : output.type === "video" ? (
              <div className="flex justify-center bg-surface-1/50 rounded-xl p-4 border border-border/50">
                <video
                  src={output.content || output.url || undefined}
                  className="max-h-[60vh] w-full rounded-lg shadow-sm"
                  controls
                  playsInline
                />
              </div>
            ) : output.type === "code" ? (
              <pre className="p-6 bg-surface-1 rounded-xl overflow-x-auto text-sm font-mono border border-border/50 shadow-sm">
                <code>{content}</code>
              </pre>
            ) : (
              <div className="max-w-3xl mx-auto prose prose-sm md:prose-base dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-accent hover:prose-a:underline">
                <div className="whitespace-pre-wrap leading-relaxed">
                  {content}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-border bg-surface-1/50 shrink-0 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleDownload}
          className="gap-2"
        >
          <Download className="w-3 h-3" />
          Download
        </Button>
      </div>
    </>
  )
}
