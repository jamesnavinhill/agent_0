"use client"

import React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { useAgentStore } from "@/lib/store/agent-store"
import { cn } from "@/lib/utils"
import { createId } from "@/lib/utils/id"
import { Button } from "@/components/ui/button"
import {
  Mic,
  MicOff,
  Paperclip,
  Send,
  X,
  ImageIcon,
  FileAudio,
  FileVideo,
  File as FileIcon,
  Loader2,
} from "lucide-react"
import { getWhisperClient } from "@/lib/voice/whisper-client"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AttachedFile {
  id: string
  file: File
  preview?: string
  type: "image" | "audio" | "video" | "document"
}

function getFileType(file: File): AttachedFile["type"] {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("audio/")) return "audio"
  if (file.type.startsWith("video/")) return "video"
  return "document"
}

function FileTypeIcon({ type }: { type: AttachedFile["type"] }) {
  switch (type) {
    case "image": return <ImageIcon className="w-4 h-4" />
    case "audio": return <FileAudio className="w-4 h-4" />
    case "video": return <FileVideo className="w-4 h-4" />
    default: return <FileIcon className="w-4 h-4" />
  }
}

interface MultimodalInputProps {
  onSend: (message: string, files?: File[]) => Promise<void>
  disabled?: boolean
}

export function MultimodalInput({ onSend, disabled }: MultimodalInputProps) {
  const [input, setInput] = useState("")
  const [attachments, setAttachments] = useState<AttachedFile[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [whisperLoading, setWhisperLoading] = useState(false)
  const [whisperProgress, setWhisperProgress] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const whisperClientRef = useRef(getWhisperClient())

  const { setState } = useAgentStore()

  // Load Whisper model on mount
  useEffect(() => {
    const loadWhisper = async () => {
      const client = whisperClientRef.current
      if (!client.ready && !client.loading) {
        setWhisperLoading(true)
        try {
          await client.loadModel('whisper-tiny', (progress) => {
            setWhisperProgress(progress)
          })
        } catch (err) {
          console.error('Failed to load Whisper model:', err)
        } finally {
          setWhisperLoading(false)
        }
      }
    }
    loadWhisper()
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newAttachments: AttachedFile[] = files.map((file) => {
      const attachment: AttachedFile = {
        id: createId(),
        file,
        type: getFileType(file),
      }

      // Create preview for images
      if (attachment.type === "image") {
        attachment.preview = URL.createObjectURL(file)
      }

      return attachment
    })

    setAttachments((prev) => [...prev, ...newAttachments])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id)
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview)
      }
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        stream.getTracks().forEach((track) => track.stop())

        // Transcribe audio with Whisper
        const client = whisperClientRef.current
        if (client.ready) {
          setIsTranscribing(true)
          try {
            const result = await client.transcribe(blob)
            // Add transcribed text to input
            setInput((prev) => prev ? `${prev} ${result.text}` : result.text)
            // Auto-resize textarea
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto"
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
              }
            }, 0)
          } catch (err) {
            console.error('Transcription failed:', err)
            // Fallback: attach audio file if transcription fails
            const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" })
            setAttachments((prev) => [...prev, {
              id: createId(),
              file,
              type: "audio"
            }])
          } finally {
            setIsTranscribing(false)
          }
        } else {
          // Whisper not ready, attach audio file
          const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" })
          setAttachments((prev) => [...prev, {
            id: createId(),
            file,
            type: "audio"
          }])
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setState("listening")
    } catch (err) {
      console.error("Failed to start recording:", err)
    }
  }, [setState])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setState("idle")
    }
  }, [isRecording, setState])

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachments.length === 0) || disabled || isSending) return

    setIsSending(true)
    const message = input.trim()
    const files = attachments.map((a) => a.file)

    setInput("")
    setAttachments([])

    try {
      await onSend(message, files.length > 0 ? files : undefined)
    } finally {
      setIsSending(false)
    }
  }, [input, attachments, disabled, isSending, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Auto-resize textarea
  const handleInput = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [])

  return (
    <TooltipProvider delayDuration={0}>
      <div className="border-t border-border bg-surface-1 p-4">
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group bg-surface-2 rounded-lg overflow-hidden"
              >
                {attachment.type === "image" && attachment.preview ? (
                  <img
                    src={attachment.preview || "/placeholder.svg"}
                    alt="attachment"
                    className="w-16 h-16 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 flex flex-col items-center justify-center gap-1 p-2">
                    <FileTypeIcon type={attachment.type} />
                    <span className="text-[10px] text-muted-foreground truncate max-w-full">
                      {attachment.file.name.slice(0, 8)}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-2 px-2 py-2">
          {/* File upload */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Attach files</TooltipContent>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Voice recording */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={disabled}
                className={cn(
                  "h-9 w-9 shrink-0",
                  isRecording
                    ? "text-destructive hover:text-destructive animate-pulse"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRecording ? "Stop recording" : "Voice input"}</TooltipContent>
          </Tooltip>

          {/* Text input */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message Komorebi..."
              disabled={disabled || isRecording}
              rows={1}
              className={cn(
                "w-full resize-none bg-transparent px-2 py-2",
                "text-sm placeholder:text-muted-foreground",
                "leading-5 focus:outline-none",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "min-h-9 max-h-[200px]"
              )}
            />
          </div>

          {/* Send button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSend}
                disabled={disabled || isSending || (!input.trim() && attachments.length === 0)}
                size="icon"
                className="h-9 w-9 shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send message</TooltipContent>
          </Tooltip>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span>Recording audio...</span>
          </div>
        )}

        {/* Transcription indicator */}
        {isTranscribing && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Transcribing...</span>
          </div>
        )}

        {/* Whisper loading indicator */}
        {whisperLoading && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading speech model... {whisperProgress}%</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
