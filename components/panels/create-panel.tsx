"use client"

import { useState } from "react"
import { useImageGeneration } from "@/hooks/use-image-generation"
import { useCodeGeneration } from "@/hooks/use-code-generation"
import { cn } from "@/lib/utils"
import { 
  Palette, 
  Code, 
  Sparkles, 
  Loader2,
  ImageIcon,
  Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type CreationType = "image" | "code"

const aspectRatioOptions = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "4:3", label: "Standard (4:3)" },
  { value: "3:4", label: "Portrait (3:4)" },
] as const

const languageOptions = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "html", label: "HTML/CSS" },
  { value: "sql", label: "SQL" },
] as const

export function CreatePanel() {
  const [creationType, setCreationType] = useState<CreationType>("image")
  const [prompt, setPrompt] = useState("")
  const [aspectRatio, setAspectRatio] = useState<string>("1:1")
  const [language, setLanguage] = useState<string>("typescript")
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)

  const { generate: generateImage, isGenerating: isImageGenerating } = useImageGeneration()
  const { generateCode, isGenerating: isCodeGenerating } = useCodeGeneration()

  const isGenerating = isImageGenerating || isCodeGenerating

  const handleCreate = async () => {
    if (!prompt.trim() || isGenerating) return

    try {
      if (creationType === "image") {
        const images = await generateImage(prompt, {
          aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
        })
        if (images.length > 0) {
          setPreviewImage(images[0].url)
        }
      } else {
        const result = await generateCode(prompt, language)
        setGeneratedCode(result.code)
      }
    } catch (error) {
      console.error("Creation failed:", error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">Create</span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setCreationType("image")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors",
              creationType === "image"
                ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                : "bg-surface-2 text-muted-foreground hover:text-foreground"
            )}
          >
            <Palette className="w-4 h-4" />
            Image
          </button>
          <button
            onClick={() => setCreationType("code")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors",
              creationType === "code"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-surface-2 text-muted-foreground hover:text-foreground"
            )}
          >
            <Code className="w-4 h-4" />
            Code
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            {creationType === "image" ? "Describe what you want to create" : "Describe the code you need"}
          </label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              creationType === "image"
                ? "A surreal landscape with floating islands..."
                : "A React hook for managing form state..."
            }
            className="min-h-[100px] resize-none"
          />
        </div>

        {creationType === "image" ? (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Aspect Ratio</label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aspectRatioOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          onClick={handleCreate}
          disabled={!prompt.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Create {creationType === "image" ? "Image" : "Code"}
            </>
          )}
        </Button>

        {previewImage && creationType === "image" && (
          <div className="mt-4 space-y-2">
            <label className="text-xs text-muted-foreground">Generated Image</label>
            <div className="rounded-lg overflow-hidden bg-surface-2">
              <img
                src={previewImage}
                alt="Generated"
                className="w-full h-auto"
              />
            </div>
          </div>
        )}

        {generatedCode && creationType === "code" && (
          <div className="mt-4 space-y-2">
            <label className="text-xs text-muted-foreground">Generated Code</label>
            <pre className="p-3 rounded-lg bg-surface-1 overflow-x-auto text-xs font-mono">
              <code>{generatedCode}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
