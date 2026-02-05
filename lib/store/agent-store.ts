import { create } from "zustand"
import { createId } from "@/lib/utils/id"

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
  prompt?: string
  category: "art" | "music" | "code" | "philosophy" | "research" | "blog" | "game"
  timestamp: Date
  metadata?: Record<string, unknown>
  url?: string
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

export interface Goal {
  id: string
  title: string
  description: string
  progress: number
  priority: "high" | "medium" | "low"
  subtasks: string[]
  deadline?: Date
  completed: boolean
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

export interface KnowledgeEntry {
  id: string
  title: string
  url?: string
  summary: string
  tags: string[]
  created_at: string
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
  fetchGallery: () => Promise<void>
  addOutput: (output: Omit<AgentOutput, "id" | "timestamp">) => void

  // Goals
  goals: Goal[]
  fetchGoals: () => Promise<void>
  addGoal: (goal: Omit<Goal, "id" | "completed">) => Promise<void>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>

  // Scheduled tasks (API backed)
  scheduledTasks: ScheduledTask[]
  fetchTasks: () => Promise<void>
  addScheduledTask: (task: Omit<ScheduledTask, "id">) => Promise<void>
  removeScheduledTask: (id: string) => Promise<void>
  toggleScheduledTask: (id: string) => void
  updateScheduledTask: (id: string, updates: Partial<ScheduledTask>) => void

  // Memory & Knowledge
  memories: MemoryEntry[]
  knowledge: KnowledgeEntry[]
  fetchMemories: () => Promise<void>
  addMemory: (type: MemoryEntry["type"], content: string, relevance: number) => void

  // Memory stats
  memory: {
    contextWindow: number
    contextUsed: number
    totalMemories: number
  }

  // UI state
  activePanel: "chat" | "thoughts" | "activity" | "gallery" | "create" | "monitor" | "schedule" | "memory" | "settings" | "subagents" | "sandbox"
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
      id: createId(),
      content,
      type,
      timestamp: new Date()
    }].slice(-50) // Keep last 50
  })),
  clearThoughts: () => set({ thoughts: [] }),

  activities: [],
  addActivity: (action, details, imageUrl) => set((s) => ({
    activities: [...s.activities, {
      id: createId(),
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

  fetchGallery: async () => {
    try {
      const res = await fetch("/api/gallery?limit=100")
      if (res.ok) {
        const data = await res.json()
        set({
          outputs: data.items.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }))
        })
      }
    } catch (error) {
      console.error("Failed to fetch gallery:", error)
    }
  },

  addOutput: (output) => set((s) => ({
    outputs: [{ ...output, id: createId(), timestamp: new Date() }, ...s.outputs]
  })),

  goals: [],

  fetchGoals: async () => {
    try {
      const res = await fetch("/api/goals")
      if (res.ok) {
        const goals = await res.json()
        set({ goals })
      }
    } catch (error) {
      console.error("Failed to fetch goals:", error)
    }
  },

  addGoal: async (goal) => {
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goal),
      })
      if (res.ok) {
        const newGoal = await res.json()
        set((s) => ({
          goals: [...s.goals, newGoal]
        }))
      }
    } catch (error) {
      console.error("Failed to add goal:", error)
    }
  },

  updateGoal: async (id, updates) => {
    try {
      // Optimistic update
      set((s) => ({
        goals: s.goals.map((g) => g.id === id ? { ...g, ...updates } : g)
      }))

      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })

      if (!res.ok) {
        // Revert if failed (would need fetchGoals() ideally)
        console.error("Failed to update goal")
      }
    } catch (error) {
      console.error("Failed to update goal:", error)
    }
  },

  deleteGoal: async (id) => {
    try {
      await fetch(`/api/goals?id=${id}`, { method: "DELETE" })
      set((s) => ({
        goals: s.goals.filter((g) => g.id !== id)
      }))
    } catch (error) {
      console.error("Failed to delete goal:", error)
    }
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

  memories: [],
  knowledge: [],

  fetchMemories: async () => {
    try {
      const res = await fetch("/api/agent/memory?limit=50")
      if (res.ok) {
        const data = await res.json()
        set({
          memories: data.memories || [],
          knowledge: data.knowledge || []
        })
      }
    } catch (error) {
      console.error("Failed to fetch memories:", error)
    }
  },

  addMemory: (type, content, relevance) => set((s) => ({
    memories: [...s.memories, {
      id: createId(),
      type: type as any,
      content,
      relevance,
      timestamp: new Date(),
      tags: [],
      created_at: new Date()
    } as any].slice(-100)
  })),

  memory: {
    contextWindow: 128000,
    contextUsed: 0,
    totalMemories: 0
  },

  activePanel: "chat",
  setActivePanel: (panel) => set({ activePanel: panel }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
