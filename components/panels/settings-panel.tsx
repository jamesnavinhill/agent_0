"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react"
import { useTheme } from "@/components/providers/theme-provider"
import { useAgentStore } from "@/lib/store/agent-store"
import { useSettings } from "@/hooks/use-settings"
import { useMemory } from "@/hooks/use-memory"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Settings,
  Sun,
  Moon,
  Palette,
  Database,
  Calendar,
  Trash2,
  Plus,
  Clock,
  ChevronRight,
  Key,
  Image,
  Video,
  MessageSquare,
  Link2,
  Download,
  Eye,
  EyeOff,
  Thermometer,
  RotateCcw,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const MAX_CHROMA = 0.37

const colorPresets = [
  { name: "Cyan", hue: 195, chroma: 0.12, lightness: 0.67 },
  { name: "Teal", hue: 170, chroma: 0.14, lightness: 0.64 },
  { name: "Blue", hue: 245, chroma: 0.14, lightness: 0.65 },
  { name: "Indigo", hue: 275, chroma: 0.14, lightness: 0.64 },
  { name: "Coral", hue: 35, chroma: 0.16, lightness: 0.67 },
  { name: "Rose", hue: 15, chroma: 0.16, lightness: 0.66 },
  { name: "Lime", hue: 140, chroma: 0.14, lightness: 0.7 },
  { name: "Gold", hue: 95, chroma: 0.14, lightness: 0.71 },
]

function isClose(a: number, b: number, tolerance: number) {
  return Math.abs(a - b) <= tolerance
}

interface AccentFieldProps {
  hue: number
  chroma: number
  lightness: number
  onChange: (next: { chroma: number; lightness: number }) => void
}

function AccentField({ hue, chroma, lightness, onChange }: AccentFieldProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const setFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const field = fieldRef.current
      if (!field) return

      const rect = field.getBoundingClientRect()
      const relativeX = (clientX - rect.left) / rect.width
      const relativeY = (clientY - rect.top) / rect.height

      const nextChroma = Math.min(MAX_CHROMA, Math.max(0, relativeX * MAX_CHROMA))
      const nextLightness = Math.min(1, Math.max(0, 1 - relativeY))
      onChange({ chroma: nextChroma, lightness: nextLightness })
    },
    [onChange]
  )

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (event: PointerEvent) => {
      setFromPointer(event.clientX, event.clientY)
    }
    const stopDragging = () => setIsDragging(false)

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", stopDragging)
    window.addEventListener("pointercancel", stopDragging)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", stopDragging)
      window.removeEventListener("pointercancel", stopDragging)
    }
  }, [isDragging, setFromPointer])

  const x = (chroma / MAX_CHROMA) * 100
  const y = (1 - lightness) * 100

  return (
    <div
      ref={fieldRef}
      className="relative h-44 w-full rounded-xl border border-border overflow-hidden cursor-crosshair touch-none"
      style={{
        background: `linear-gradient(to right, oklch(0.6 0 ${hue}), oklch(0.6 ${MAX_CHROMA} ${hue}))`,
      }}
      onPointerDown={(event) => {
        event.preventDefault()
        setFromPointer(event.clientX, event.clientY)
        setIsDragging(true)
      }}
      role="presentation"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-white/80" />
      <div
        className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          backgroundColor: `oklch(${lightness} ${chroma} ${hue})`,
        }}
      />
    </div>
  )
}

function SettingGroup({
  title,
  icon: Icon,
  description,
  children,
  className,
}: {
  title: string
  icon: ComponentType<{ className?: string }>
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-surface-2/50 p-4 space-y-4", className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent" />
          <h4 className="text-sm font-medium">{title}</h4>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

export function SettingsPanel() {
  const { theme, setTheme, accent, setAccent, resetAccent } = useTheme()
  const { scheduledTasks, toggleScheduledTask, removeScheduledTask, fetchTasks, memories, clearMessages, clearThoughts, outputs } = useAgentStore()
  const {
    settings,
    setApiKey,
    setModel,
    setImageModel,
    setImageAspectRatio,
    setVideoModel,
    setVideoAspectRatio,
    setVideoResolution,
    setVideoDurationSeconds,
    setVideoIncludeAudio,
    setTemperature,
    setSchedulesEnabled,
    hasApiKey,
  } = useSettings()
  const { exportToJSON: exportMemories } = useMemory()

  const [expandedSection, setExpandedSection] = useState<string | null>("api")
  const [showApiKey, setShowApiKey] = useState(false)
  const [syncingTasks, setSyncingTasks] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  const handleSyncTaskSettings = async () => {
    if (syncingTasks) return
    setSyncingTasks(true)
    setSyncStatus(null)

    const updates: Array<{ id: string; parameters: Record<string, unknown> }> = []

    const mediaTask = (scheduledTasks ?? []).find((task) => task.name === "Meaningful Media")
    if (mediaTask) {
      updates.push({
        id: mediaTask.id,
        parameters: {
          ...(mediaTask.parameters ?? {}),
          model: settings.imageModel,
          aspectRatio: settings.imageAspectRatio,
        },
      })
    }

    const motionTask = (scheduledTasks ?? []).find((task) => task.name === "Motion Art")
    if (motionTask) {
      updates.push({
        id: motionTask.id,
        parameters: {
          ...(motionTask.parameters ?? {}),
          model: settings.videoModel,
          aspectRatio: settings.videoAspectRatio,
          resolution: settings.videoResolution,
          durationSeconds: settings.videoDurationSeconds,
          includeAudio: settings.videoIncludeAudio,
        },
      })
    }

    if (updates.length === 0) {
      setSyncStatus("No matching tasks found to sync.")
      setSyncingTasks(false)
      return
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to sync task settings")
      }

      await fetchTasks()
      const count = data.updated ?? updates.length
      setSyncStatus(`Synced ${count} task${count === 1 ? "" : "s"}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed"
      setSyncStatus(message)
    } finally {
      setSyncingTasks(false)
    }
  }

  const exportGallery = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      outputs: outputs.map((output) => ({
        ...output,
        timestamp: output.timestamp.toISOString(),
      })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `komorebi-gallery-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const accentDisplay = useMemo(
    () => `oklch(${accent.lightness.toFixed(3)} ${accent.chroma.toFixed(3)} ${accent.hue})`,
    [accent]
  )

  const sections = [
    {
      id: "appearance",
      label: "Appearance",
      icon: Palette,
      content: (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/50 p-4">
            <div className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span className="text-sm">Dark mode</span>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>

          <div className="rounded-xl border border-border bg-surface-2/50 p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Accent Designer</p>
                <p className="text-xs text-muted-foreground">
                  Shape hue, chroma, and lightness directly.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={resetAccent}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-2">
              <div
                className="h-8 w-8 rounded-full border border-border"
                style={{ backgroundColor: accentDisplay }}
              />
              <code className="text-xs text-muted-foreground">{accentDisplay}</code>
            </div>

            <AccentField
              hue={accent.hue}
              chroma={accent.chroma}
              lightness={accent.lightness}
              onChange={(next) => setAccent(next)}
            />

            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Hue</span>
                  <span>{accent.hue}</span>
                </div>
                <Slider
                  value={[accent.hue]}
                  onValueChange={([hue]) => setAccent({ hue })}
                  min={0}
                  max={360}
                  step={1}
                />
                <div
                  className="h-2 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${Array.from({ length: 19 }, (_, index) => `oklch(0.66 0.15 ${index * 20})`).join(", ")})`,
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Chroma</span>
                  <span>{accent.chroma.toFixed(3)}</span>
                </div>
                <Slider
                  value={[accent.chroma]}
                  onValueChange={([chroma]) => setAccent({ chroma })}
                  min={0}
                  max={MAX_CHROMA}
                  step={0.001}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Lightness</span>
                  <span>{accent.lightness.toFixed(3)}</span>
                </div>
                <Slider
                  value={[accent.lightness]}
                  onValueChange={([lightness]) => setAccent({ lightness })}
                  min={0}
                  max={1}
                  step={0.001}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {colorPresets.map((preset) => {
                const active =
                  isClose(accent.hue, preset.hue, 1) &&
                  isClose(accent.chroma, preset.chroma, 0.002) &&
                  isClose(accent.lightness, preset.lightness, 0.002)

                return (
                  <button
                    key={preset.name}
                    onClick={() => setAccent(preset)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      "ring-2 ring-offset-2 ring-offset-background",
                      active ? "ring-foreground scale-110" : "ring-transparent hover:ring-muted"
                    )}
                    style={{
                      backgroundColor: `oklch(${preset.lightness} ${preset.chroma} ${preset.hue})`,
                    }}
                    title={preset.name}
                    aria-label={`Use ${preset.name} accent`}
                  />
                )
              })}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "api",
      label: "API Configuration",
      icon: Key,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SettingGroup
              title="Chat"
              icon={MessageSquare}
              description="Credentials and core model behavior."
            >
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Gemini API Key</label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={settings.apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="Enter your API key"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {hasApiKey ? "API key configured." : "Get your API key from ai.google.dev."}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Chat Model</label>
                <Select value={settings.model} onValueChange={(value) => setModel(value as typeof settings.model)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-3-flash-preview">Gemini 3 Flash (Fast)</SelectItem>
                    <SelectItem value="gemini-3-pro-preview">Gemini 3 Pro (Brain)</SelectItem>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Agentic)</SelectItem>
                    <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Ultra Fast)</SelectItem>
                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Research)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground flex items-center gap-1">
                    <Thermometer className="w-3 h-3" />
                    Creativity
                  </label>
                  <span className="text-xs text-muted-foreground">{settings.temperature.toFixed(1)}</span>
                </div>
                <Slider
                  value={[settings.temperature]}
                  onValueChange={([temperature]) => setTemperature(temperature)}
                  min={0}
                  max={2}
                  step={0.1}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Precise</span>
                  <span>Balanced</span>
                  <span>Creative</span>
                </div>
              </div>
            </SettingGroup>

            <SettingGroup
              title="Image"
              icon={Image}
              description="Image generation model and framing."
            >
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Image Model</label>
                <Select value={settings.imageModel} onValueChange={(value) => setImageModel(value as typeof settings.imageModel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.5-flash-image">Gemini 2.5 Flash Image (Default)</SelectItem>
                    <SelectItem value="gemini-3-pro-image-preview">Gemini 3 Pro Image (Preview)</SelectItem>
                    <SelectItem value="imagen-4.0-generate-001">Imagen 4 Generate</SelectItem>
                    <SelectItem value="imagen-4.0-ultra-generate-001">Imagen 4 Ultra</SelectItem>
                    <SelectItem value="imagen-4.0-fast-generate-001">Imagen 4 Fast</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Image Aspect Ratio</label>
                <Select value={settings.imageAspectRatio} onValueChange={(value) => setImageAspectRatio(value as typeof settings.imageAspectRatio)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">Square (1:1)</SelectItem>
                    <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                    <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                    <SelectItem value="4:3">Standard (4:3)</SelectItem>
                    <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </SettingGroup>

            <SettingGroup
              title="Video"
              icon={Video}
              description="Veo model, format, and duration."
            >
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Video Model</label>
                <Select value={settings.videoModel} onValueChange={(value) => setVideoModel(value as typeof settings.videoModel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veo-3.0-fast-generate-001">Veo 3 Fast Generate</SelectItem>
                    <SelectItem value="veo-3.0-generate-001">Veo 3 Generate</SelectItem>
                    <SelectItem value="veo-3.1-fast-generate-preview">Veo 3.1 Fast (Preview)</SelectItem>
                    <SelectItem value="veo-3.1-generate-preview">Veo 3.1 (Preview)</SelectItem>
                    <SelectItem value="veo-2.0-generate-001">Veo 2 Generate (Silent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Include Audio (Experimental)</label>
                  <p className="text-xs text-muted-foreground">
                    Some models may ignore or reject this flag.
                  </p>
                </div>
                <Switch
                  checked={settings.videoIncludeAudio}
                  onCheckedChange={(checked) => setVideoIncludeAudio(checked)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Aspect</label>
                  <Select value={settings.videoAspectRatio} onValueChange={(value) => setVideoAspectRatio(value as typeof settings.videoAspectRatio)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="9:16">9:16</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Resolution</label>
                  <Select value={settings.videoResolution} onValueChange={(value) => setVideoResolution(value as typeof settings.videoResolution)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1080p">1080p</SelectItem>
                      <SelectItem value="720p">720p</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Duration</label>
                  <Select value={String(settings.videoDurationSeconds)} onValueChange={(value) => setVideoDurationSeconds(Number(value) as typeof settings.videoDurationSeconds)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4s</SelectItem>
                      <SelectItem value="6">6s</SelectItem>
                      <SelectItem value="8">8s</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SettingGroup>

            <SettingGroup
              title="Scheduling Sync"
              icon={Link2}
              description="Sync media model settings into cron-backed tasks."
              className="xl:col-span-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Enable scheduled task execution</label>
                  <p className="text-xs text-muted-foreground">
                    Disables scheduler-driven runs when turned off.
                  </p>
                </div>
                <Switch
                  checked={settings.schedulesEnabled}
                  onCheckedChange={setSchedulesEnabled}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Applies current image/video settings to &quot;Meaningful Media&quot; and &quot;Motion Art&quot;.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncTaskSettings}
                  disabled={syncingTasks}
                >
                  {syncingTasks ? "Syncing..." : "Sync Now"}
                </Button>
              </div>
              {syncStatus && <p className="text-xs text-muted-foreground">{syncStatus}</p>}
            </SettingGroup>
          </div>
        </div>
      ),
    },
    {
      id: "schedule",
      label: "Scheduled Tasks",
      icon: Calendar,
      content: (
        <div className="space-y-3">
          {(scheduledTasks ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No scheduled tasks</p>
          ) : (
            (scheduledTasks ?? []).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={task.enabled}
                    onCheckedChange={() => toggleScheduledTask(task.id)}
                  />
                  <div>
                    <p className="text-sm font-medium">{task.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{task.schedule}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeScheduledTask(task.id)}
                  className="w-8 h-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
          <Button variant="outline" className="w-full gap-2 bg-transparent">
            <Plus className="w-4 h-4" />
            Add task
          </Button>
        </div>
      ),
    },
    {
      id: "memory",
      label: "Memory",
      icon: Database,
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-lg bg-surface-2">
              <p className="text-lg font-medium">{memories.filter((memory) => memory.type === "short").length}</p>
              <p className="text-xs text-muted-foreground">Short-term</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-2">
              <p className="text-lg font-medium">{memories.filter((memory) => memory.type === "long").length}</p>
              <p className="text-xs text-muted-foreground">Long-term</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-2">
              <p className="text-lg font-medium">{memories.filter((memory) => memory.type === "episodic").length}</p>
              <p className="text-xs text-muted-foreground">Episodic</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Memory systems store context and learned information for improved interactions.
          </p>
        </div>
      ),
    },
    {
      id: "data",
      label: "Data Management",
      icon: Trash2,
      content: (
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-transparent"
            onClick={clearMessages}
          >
            <Trash2 className="w-4 h-4" />
            Clear chat history
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-transparent"
            onClick={clearThoughts}
          >
            <Trash2 className="w-4 h-4" />
            Clear thought stream
          </Button>
          <p className="text-xs text-muted-foreground">
            Clearing data cannot be undone. Outputs in the gallery are preserved.
          </p>
        </div>
      ),
    },
    {
      id: "export",
      label: "Export",
      icon: Download,
      content: (
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-transparent"
            onClick={exportMemories}
          >
            <Download className="w-4 h-4" />
            Export Memories
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-transparent"
            onClick={exportGallery}
          >
            <Download className="w-4 h-4" />
            Export Gallery
          </Button>
          <p className="text-xs text-muted-foreground">
            Exports are saved as JSON files that can be imported later.
          </p>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Settings className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium">Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sections.map((section) => (
          <Collapsible
            key={section.id}
            open={expandedSection === section.id}
            onOpenChange={(open) => setExpandedSection(open ? section.id : null)}
          >
            <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-2">
                <section.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{section.label}</span>
              </div>
              <ChevronRight
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  expandedSection === section.id && "rotate-90"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              <div className="pt-2 border-t border-border mt-2">
                {section.content}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}
