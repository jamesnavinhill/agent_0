"use client"

import { useEffect, useState, type ElementType } from "react"
import { useAgentStore, type AgentOutput } from "@/lib/store/agent-store"
import { cn } from "@/lib/utils"
import { downloadFile, downloadUrl, copyToClipboard, sanitizeFilename } from "@/lib/utils/export-utils"
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
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

const categoryConfig: Record<
  AgentOutput["category"],
  { icon: ElementType; label: string; color: string; description: string }
> = {
  art: {
    icon: Palette,
    label: "Art Gallery",
    color: "text-pink-400 bg-pink-400/10",
    description: "Generated images and artwork",
  },
  music: {
    icon: Music,
    label: "Music Studio",
    color: "text-purple-400 bg-purple-400/10",
    description: "Audio compositions",
  },
  code: {
    icon: Code,
    label: "Code Lab",
    color: "text-green-400 bg-green-400/10",
    description: "Snippets and repositories",
  },
  philosophy: {
    icon: BookOpen,
    label: "Philosophy",
    color: "text-amber-400 bg-amber-400/10",
    description: "Reflections and thoughts",
  },
  research: {
    icon: FlaskConical,
    label: "Research",
    color: "text-blue-400 bg-blue-400/10",
    description: "Reports and findings",
  },
  blog: {
    icon: Newspaper,
    label: "Blog",
    color: "text-orange-400 bg-orange-400/10",
    description: "Articles and posts",
  },
  game: {
    icon: Gamepad2,
    label: "Games",
    color: "text-red-400 bg-red-400/10",
    description: "Interactive experiences",
  },
}

type ViewMode = "grid" | "list"
type NavigationState = "stacks" | "category"

function isMediaType(type: AgentOutput["type"]) {
  return type === "image" || type === "video" || type === "audio"
}

function isDailyBriefOutput(output: AgentOutput) {
  const title = (output.title || "").toLowerCase()
  const source = String(output.metadata?.source || "").toLowerCase()
  return title.includes("daily brief") || source === "morning-read"
}

function getMediaUrl(output: AgentOutput): string | undefined {
  if (isMediaType(output.type)) return output.content || output.url || undefined
  return undefined
}

function getCodeExtension(output: AgentOutput) {
  const language = String(output.metadata?.language || "").toLowerCase()
  switch (language) {
    case "typescript":
    case "ts":
      return "ts"
    case "tsx":
      return "tsx"
    case "javascript":
    case "js":
      return "js"
    case "jsx":
      return "jsx"
    case "python":
    case "py":
      return "py"
    case "go":
      return "go"
    case "rust":
      return "rs"
    case "java":
      return "java"
    case "c":
      return "c"
    case "cpp":
    case "c++":
      return "cpp"
    case "json":
      return "json"
    case "html":
      return "html"
    case "css":
      return "css"
    case "markdown":
    case "md":
      return "md"
    case "shell":
    case "bash":
    case "sh":
      return "sh"
    default:
      return "txt"
  }
}

export function GalleryPanel() {
  const { outputs, fetchGallery } = useAgentStore()
  const [navState, setNavState] = useState<NavigationState>("stacks")
  const [selectedCategory, setSelectedCategory] = useState<AgentOutput["category"] | "all">("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [selectedOutput, setSelectedOutput] = useState<AgentOutput | null>(null)

  useEffect(() => {
    fetchGallery()
  }, [fetchGallery])

  const exportAllOutputs = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      outputs: outputs.map((output) => ({
        ...output,
        timestamp: output.timestamp.toISOString(),
      })),
    }
    downloadFile(
      `komorebi-gallery-${new Date().toISOString().split("T")[0]}.json`,
      JSON.stringify(data, null, 2),
      "application/json"
    )
  }

  const filteredOutputs =
    selectedCategory === "all"
      ? outputs
      : outputs.filter((output) => output.category === selectedCategory)

  const categories = Object.keys(categoryConfig) as AgentOutput["category"][]
  const categoryCounts = categories.reduce((acc, category) => {
    acc[category] = outputs.filter((output) => output.category === category).length
    return acc
  }, {} as Record<AgentOutput["category"], number>)

  const handleStackClick = (category: AgentOutput["category"]) => {
    setSelectedCategory(category)
    setNavState("category")
  }

  const handleBackToStacks = () => {
    setNavState("stacks")
    setSelectedCategory("all")
  }

  const selectedIsMedia = selectedOutput ? isMediaType(selectedOutput.type) : false
  const selectedIsDailyBrief = selectedOutput ? isDailyBriefOutput(selectedOutput) : false

  return (
    <div className="flex flex-col h-full bg-background/50">
      <div className="px-4 py-3 border-b border-border space-y-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-accent" />
            {navState === "category" ? (
              <button
                type="button"
                onClick={handleBackToStacks}
                className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                Creations
              </button>
            ) : (
              <span className="text-sm font-medium text-foreground/80">Creations</span>
            )}
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

      <div className="flex-1 overflow-y-auto p-4">
        {navState === "stacks" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const config = categoryConfig[category]
              const count = categoryCounts[category]

              return (
                <button
                  key={category}
                  onClick={() => handleStackClick(category)}
                  className="group relative flex flex-col items-start p-6 rounded-xl border border-border/50 bg-surface-1 hover:bg-surface-2 hover:border-accent/50 transition-all duration-300 text-left h-48 overflow-hidden"
                >
                  <div className="flex items-start justify-between w-full mb-4 z-10">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                        config.color,
                        "group-hover:bg-accent group-hover:text-accent-foreground"
                      )}
                    >
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

                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-background/50 to-transparent pointer-events-none" />
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-gradient-to-br from-accent/5 to-transparent blur-2xl group-hover:from-accent/10 transition-all" />
                </button>
              )
            })}
          </div>
        ) : (
          <>
            {filteredOutputs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground opacity-50">
                <div
                  className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-surface-2",
                    categoryConfig[selectedCategory as AgentOutput["category"]]?.color
                  )}
                >
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
                          src={getMediaUrl(output) || "/placeholder.svg"}
                          alt={output.title || "Generated image"}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : output.type === "video" ? (
                        <video
                          src={getMediaUrl(output)}
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
                              {output.content || output.url || ""}
                            </p>
                          </div>

                          <div className="absolute bottom-2 right-2">
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-5 px-1.5 bg-background/80 backdrop-blur-sm border-border/50"
                            >
                              {output.type}
                            </Badge>
                          </div>
                        </div>
                      )}

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
                  const previewText = (output.content || output.url || "")
                    .replace(/[*#_`]/g, " ")
                    .slice(0, 120)
                  return (
                    <button
                      key={output.id}
                      onClick={() => setSelectedOutput(output)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-surface-1 hover:bg-surface-2 hover:border-accent/50 transition-all text-left group"
                    >
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                          config.color
                        )}
                      >
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
                          {previewText}
                          {previewText.length >= 120 ? "..." : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-muted-foreground block">
                          {new Date(output.timestamp).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50 block">
                          {new Date(output.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

      <Dialog open={!!selectedOutput} onOpenChange={() => setSelectedOutput(null)}>
        <DialogContent
          className={cn(
            "flex flex-col p-0 gap-0 overflow-hidden border-border/50 sm:rounded-2xl shadow-2xl",
            selectedIsMedia && "max-w-[min(96vw,1500px)] h-[min(94vh,980px)]",
            !selectedIsMedia && selectedIsDailyBrief && "max-w-[min(94vw,1320px)] h-[min(92vh,940px)]",
            !selectedIsMedia && !selectedIsDailyBrief && "max-w-[min(92vw,1120px)] h-[min(90vh,900px)]"
          )}
        >
          {selectedOutput && <DetailContent output={selectedOutput} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailContent({ output }: { output: AgentOutput }) {
  const [content, setContent] = useState<string>(output.content || "")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const categoryConfigItem = categoryConfig[output.category]
  const mediaUrl = getMediaUrl(output)
  const isMedia = isMediaType(output.type)
  const isDailyBrief = isDailyBriefOutput(output)
  const textContent = content || output.content || ""

  useEffect(() => {
    const outputUrl = output.url
    if (
      (!output.content || output.type === "text" || output.type === "code") &&
      outputUrl &&
      (output.type === "text" || output.type === "code" || output.category === "research")
    ) {
      const fetchContent = async () => {
        setLoading(true)
        try {
          const response = await fetch(outputUrl)
          if (response.ok) {
            const text = await response.text()
            if (outputUrl.endsWith(".json")) {
              try {
                const json = JSON.parse(text)
                setContent(typeof json.content === "string" ? json.content : text)
              } catch {
                setContent(text)
              }
            } else {
              setContent(text)
            }
          }
        } catch (error) {
          console.error("Failed to load content", error)
          setContent("Failed to load content.")
        } finally {
          setLoading(false)
        }
      }
      fetchContent()
    }
  }, [output])

  const handleCopy = async () => {
    const source = textContent || mediaUrl || output.url || ""
    const success = await copyToClipboard(source)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = async () => {
    const filename = sanitizeFilename(output.title || output.category) || "download"

    if (output.type === "image" && mediaUrl) {
      await downloadUrl(mediaUrl, filename, "png")
      return
    }
    if (output.type === "video" && mediaUrl) {
      await downloadUrl(mediaUrl, filename, "mp4")
      return
    }
    if (output.type === "audio" && mediaUrl) {
      await downloadUrl(mediaUrl, filename, "mp3")
      return
    }
    if (output.type === "code") {
      const extension = getCodeExtension(output)
      downloadFile(`${filename}.${extension}`, textContent, "text/plain")
      return
    }
    if (output.type === "text") {
      if (output.url && !output.url.startsWith("data:")) {
        await downloadUrl(output.url, filename, isDailyBrief ? "md" : "txt")
        return
      }
      const extension = isDailyBrief ? "md" : "txt"
      const mimeType = extension === "md" ? "text/markdown" : "text/plain"
      downloadFile(`${filename}.${extension}`, textContent, mimeType)
      return
    }

    downloadFile(`${filename}.txt`, textContent, "text/plain")
  }

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
              <span>|</span>
              <span>{new Date(output.timestamp).toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>

      <div className={cn("flex-1 overflow-y-auto bg-background", isMedia ? "p-2 md:p-3" : "p-6 md:p-8")}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">
            Loading content...
          </div>
        ) : (
          <>
            {output.type === "image" ? (
              <div className="h-full w-full rounded-xl border border-border/50 bg-surface-1/40 flex items-center justify-center overflow-hidden">
                <img
                  src={mediaUrl || "/placeholder.svg"}
                  alt={output.title || "Generated image"}
                  className="max-h-[calc(100vh-13rem)] max-w-full object-contain"
                />
              </div>
            ) : output.type === "video" ? (
              <div className="h-full w-full rounded-xl border border-border/50 bg-surface-1/40 flex items-center justify-center overflow-hidden">
                <video
                  src={mediaUrl}
                  className="max-h-[calc(100vh-13rem)] max-w-full rounded-md object-contain"
                  controls
                  playsInline
                />
              </div>
            ) : output.type === "audio" ? (
              <div className="h-full w-full rounded-xl border border-border/50 bg-surface-1/40 flex items-center justify-center p-6">
                <audio
                  src={mediaUrl}
                  controls
                  className="w-full max-w-3xl"
                />
              </div>
            ) : output.type === "code" ? (
              <pre className="p-6 bg-surface-1 rounded-xl overflow-x-auto text-sm font-mono border border-border/50 shadow-sm">
                <code>{textContent}</code>
              </pre>
            ) : (
              <div
                className={cn(
                  "mx-auto w-full whitespace-pre-wrap text-muted-foreground",
                  isDailyBrief ? "max-w-[92ch] text-[15px] leading-8" : "max-w-[76ch] text-sm leading-7"
                )}
              >
                {textContent}
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
