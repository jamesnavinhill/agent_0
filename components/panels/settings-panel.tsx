"use client"

import { useState } from "react"
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
  Cpu,
  Download,
  Upload,
  Eye,
  EyeOff,
  Thermometer,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Color presets for quick selection
const colorPresets = [
  { name: "Cyan", hue: 180 },
  { name: "Teal", hue: 165 },
  { name: "Blue", hue: 220 },
  { name: "Purple", hue: 270 },
  { name: "Pink", hue: 330 },
  { name: "Red", hue: 0 },
  { name: "Orange", hue: 30 },
  { name: "Green", hue: 140 },
]

export function SettingsPanel() {
  const { theme, setTheme, accentHue, setAccentHue } = useTheme()
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
    setTemperature,
    setSchedulesEnabled,
    hasApiKey,
  } = useSettings()
  const { exportToJSON: exportMemories } = useMemory()

  const [expandedSection, setExpandedSection] = useState<string | null>("appearance")
  const [showApiKey, setShowApiKey] = useState(false)
  const [syncingTasks, setSyncingTasks] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  const handleSyncTaskSettings = async () => {
    if (syncingTasks) return
    setSyncingTasks(true)
    setSyncStatus(null)

    const updates: Array<{ id: string; parameters: Record<string, unknown> }> = []

      const mediaTask = (scheduledTasks ?? []).find((t) => t.name === "Meaningful Media")
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

    const motionTask = (scheduledTasks ?? []).find((t) => t.name === "Motion Art")
    if (motionTask) {
      updates.push({
        id: motionTask.id,
        parameters: {
          ...(motionTask.parameters ?? {}),
          model: settings.videoModel,
          aspectRatio: settings.videoAspectRatio,
          resolution: settings.videoResolution,
          durationSeconds: settings.videoDurationSeconds,
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
      setSyncStatus(`Synced ${data.updated ?? updates.length} task${(data.updated ?? updates.length) === 1 ? "" : "s"}.`)
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
      outputs: outputs.map(o => ({
        ...o,
        timestamp: o.timestamp.toISOString()
      }))
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `agent-zero-gallery-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const sections = [
    {
      id: "appearance",
      label: "Appearance",
      icon: Palette,
      content: (
        <div className="space-y-4">
          {/* Theme toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span className="text-sm">Dark mode</span>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>

          {/* Accent color */}
          <div className="space-y-3">
            <span className="text-sm text-muted-foreground">Accent color</span>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={preset.hue}
                  onClick={() => setAccentHue(preset.hue)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    "ring-2 ring-offset-2 ring-offset-background",
                    accentHue === preset.hue ? "ring-foreground scale-110" : "ring-transparent hover:ring-muted"
                  )}
                  style={{
                    backgroundColor: `oklch(0.65 0.15 ${preset.hue})`,
                  }}
                  title={preset.name}
                />
              ))}
            </div>

            {/* Custom hue slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Custom hue</span>
                <span>{accentHue}</span>
              </div>
              <Slider
                value={[accentHue]}
                onValueChange={([value]) => setAccentHue(value)}
                min={0}
                max={360}
                step={1}
                className="w-full"
              />
              <div
                className="h-2 rounded-full"
                style={{
                  background: `linear-gradient(to right, ${Array.from({ length: 12 }, (_, i) =>
                    `oklch(0.65 0.15 ${i * 30})`
                  ).join(", ")})`
                }}
              />
            </div>
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
            (scheduledTasks ?? []).map((task) => (<div
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
              <p className="text-lg font-medium">{memories.filter((m) => m.type === "short").length}</p>
              <p className="text-xs text-muted-foreground">Short-term</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-2">
              <p className="text-lg font-medium">{memories.filter((m) => m.type === "long").length}</p>
              <p className="text-xs text-muted-foreground">Long-term</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-2">
              <p className="text-lg font-medium">{memories.filter((m) => m.type === "episodic").length}</p>
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
      id: "api",
      label: "API Configuration",
      icon: Key,
      content: (
        <div className="space-y-4">
          {/* API Key */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Gemini API Key</label>
            <div className="flex gap-2">
              <Input
                type={showApiKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) => setApiKey(e.target.value)}
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
              {hasApiKey ? "✓ API key configured" : "Get your API key from ai.google.dev"}
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Chat Model</label>
            <Select value={settings.model} onValueChange={(v) => setModel(v as typeof settings.model)}>
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

          {/* Image Model Selection */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Image Model</label>
            <Select value={settings.imageModel} onValueChange={(v) => setImageModel(v as typeof settings.imageModel)}>
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
            <Select value={settings.imageAspectRatio} onValueChange={(v) => setImageAspectRatio(v as typeof settings.imageAspectRatio)}>
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

          {/* Video Model Selection */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Video Model (Veo)</label>
            <Select value={settings.videoModel} onValueChange={(v) => setVideoModel(v as typeof settings.videoModel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="veo-3.0-fast-generate-001">Veo 3 Fast Generate</SelectItem>
                <SelectItem value="veo-3.0-generate-001">Veo 3 Generate</SelectItem>
                <SelectItem value="veo-3.1-fast-generate-preview">Veo 3.1 Fast (Preview)</SelectItem>
                <SelectItem value="veo-3.1-generate-preview">Veo 3.1 (Preview)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Video Settings */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Video Aspect Ratio</label>
            <Select value={settings.videoAspectRatio} onValueChange={(v) => setVideoAspectRatio(v as typeof settings.videoAspectRatio)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                <SelectItem value="9:16">Portrait (9:16)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Video Resolution</label>
            <Select value={settings.videoResolution} onValueChange={(v) => setVideoResolution(v as typeof settings.videoResolution)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1080p">1080p (Best)</SelectItem>
                <SelectItem value="720p">720p</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Video Duration</label>
            <Select value={String(settings.videoDurationSeconds)} onValueChange={(v) => setVideoDurationSeconds(Number(v) as typeof settings.videoDurationSeconds)}>
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

          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Sync to Scheduled Tasks</label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncTaskSettings}
                disabled={syncingTasks}
                className="gap-2"
              >
                {syncingTasks ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Applies current image/video settings to the “Meaningful Media” and “Motion Art” tasks (used by cron).
            </p>
            {syncStatus && (
              <p className="text-xs text-muted-foreground">{syncStatus}</p>
            )}
          </div>

          {/* Temperature */}
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
              onValueChange={([v]) => setTemperature(v)}
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Precise</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "export",
      label: "Export & Import",
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
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Settings className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium">Settings</span>
      </div>

      {/* Settings sections */}
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
              <ChevronRight className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                expandedSection === section.id && "rotate-90"
              )} />
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
