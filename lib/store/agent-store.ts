import { create } from "zustand"

export type AgentState =
  | "idle"
  | "listening"
  | "thinking"
  | "creating"
  | "speaking"
  | "error"

export type OutputType = "text" | "image" | "video" | "audio" | "code"

export interface AgentOutput {
  id: string
  type: OutputType
  content: string
  title?: string
  category: "art" | "music" | "code" | "philosophy" | "research" | "blog" | "game"
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface ThoughtEntry {
  id: string
  content: string
  timestamp: Date
  type: "observation" | "reasoning" | "decision" | "action"
}

export interface ActivityEntry {
  id: string
  action: string
  details?: string
  imageUrl?: string // Snapshot URL
  timestamp: Date
  status: "pending" | "running" | "complete" | "error"
}

export interface ScheduledTask {
  id: string
  name: string
  description?: string
  schedule: string
  nextRun?: Date
  lastRun?: Date
  enabled: boolean
  category?: string
  prompt?: string
  parameters?: Record<string, unknown>
}

export interface MemoryEntry {
  id: string
  type: "short" | "long" | "episodic"
  content: string
  timestamp: Date
  relevance: number
}

interface AgentStore {
  // Agent state
  state: AgentState
  setState: (state: AgentState) => void

  // Messages/conversation
  messages: Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>
  addMessage: (role: "user" | "assistant", content: string) => void
  clearMessages: () => void

  // Thoughts stream
  thoughts: ThoughtEntry[]
  addThought: (content: string, type: ThoughtEntry["type"]) => void
  clearThoughts: () => void

  // Activity log
  activities: ActivityEntry[]
  addActivity: (action: string, details?: string, imageUrl?: string) => void
  updateActivity: (id: string, status: ActivityEntry["status"]) => void

  // Outputs/creations
  outputs: AgentOutput[]
  addOutput: (output: Omit<AgentOutput, "id" | "timestamp">) => void

  // Scheduled tasks
  tasks: ScheduledTask[]
  addTask: (task: Omit<ScheduledTask, "id">) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void

  // Memory
  memories: MemoryEntry[]
  addMemory: (type: MemoryEntry["type"], content: string, relevance: number) => void

  // Memory stats
  memory: {
    contextWindow: number
    contextUsed: number
    totalMemories: number
  }

  // Scheduled tasks (extended)
  scheduledTasks: ScheduledTask[]
  fetchTasks: () => Promise<void>
  addScheduledTask: (task: Omit<ScheduledTask, "id">) => Promise<void>
  removeScheduledTask: (id: string) => Promise<void>
  toggleScheduledTask: (id: string) => void
  updateScheduledTask: (id: string, updates: Partial<ScheduledTask>) => void

  // UI state
  activePanel: "chat" | "thoughts" | "activity" | "gallery" | "create" | "monitor" | "schedule" | "memory" | "settings" | "subagents"
  setActivePanel: (panel: AgentStore["activePanel"]) => void

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  state: "idle",
  setState: (state) => set({ state }),

  messages: [],
  addMessage: (role, content) => set((s) => ({
    messages: [...s.messages, { role, content, timestamp: new Date() }]
  })),
  clearMessages: () => set({ messages: [] }),

  thoughts: [],
  addThought: (content, type) => set((s) => ({
    thoughts: [...s.thoughts, {
      id: crypto.randomUUID(),
      content,
      type,
      timestamp: new Date()
    }].slice(-50) // Keep last 50
  })),
  clearThoughts: () => set({ thoughts: [] }),

  activities: [],
  addActivity: (action, details, imageUrl) => set((s) => ({
    activities: [...s.activities, {
      id: crypto.randomUUID(),
      action,
      details,
      imageUrl,
      timestamp: new Date(),
      status: "running" as const
    }].slice(-100)
  })),
  updateActivity: (id, status) => set((s) => ({
    activities: s.activities.map((a) => a.id === id ? { ...a, status } : a)
  })),

  outputs: [],
  addOutput: (output) => set((s) => ({
    outputs: [...s.outputs, { ...output, id: crypto.randomUUID(), timestamp: new Date() }]
  })),

  tasks: [
    { id: "1", name: "Generate daily artwork", schedule: "0 9 * * *", nextRun: new Date(), enabled: true, category: "art" },
    { id: "2", name: "Write philosophical reflection", schedule: "0 20 * * *", nextRun: new Date(), enabled: true, category: "philosophy" },
    { id: "3", name: "Research trending topics", schedule: "0 12 * * *", nextRun: new Date(), enabled: false, category: "research" },
  ],
  addTask: (task) => set((s) => ({
    tasks: [...s.tasks, { ...task, id: crypto.randomUUID() }]
  })),
  toggleTask: (id) => set((s) => ({
    tasks: s.tasks.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t)
  })),
  removeTask: (id) => set((s) => ({
    tasks: s.tasks.filter((t) => t.id !== id)
  })),

  memories: [],
  addMemory: (type, content, relevance) => set((s) => ({
    memories: [...s.memories, {
      id: crypto.randomUUID(),
      type,
      content,
      timestamp: new Date(),
      relevance
    }]
  })),

  memory: {
    contextWindow: 128000,
    contextUsed: 45000,
    totalMemories: 847,
  },

  scheduledTasks: [],

  fetchTasks: async () => {
    try {
      const res = await fetch("/api/tasks")
      if (res.ok) {
        const tasks = await res.json()
        set({ scheduledTasks: tasks })
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    }
  },

  addScheduledTask: async (task) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      })
      if (res.ok) {
        const newTask = await res.json()
        set((s) => ({
          scheduledTasks: [...s.scheduledTasks, newTask]
        }))
      }
    } catch (error) {
      console.error("Failed to add task:", error)
    }
  },

  removeScheduledTask: async (id) => {
    try {
      await fetch(`/api/tasks?id=${id}`, { method: "DELETE" })
      set((s) => ({
        scheduledTasks: s.scheduledTasks.filter((t) => t.id !== id)
      }))
    } catch (error) {
      console.error("Failed to remove task:", error)
    }
  },

  toggleScheduledTask: (id) => set((s) => ({
    scheduledTasks: s.scheduledTasks.map((t) =>
      t.id === id ? { ...t, enabled: !t.enabled } : t
    )
  })),

  updateScheduledTask: (id, updates) => set((s) => ({
    scheduledTasks: s.scheduledTasks.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    )
  })),

  activePanel: "chat",
  setActivePanel: (panel) => set({ activePanel: panel }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
