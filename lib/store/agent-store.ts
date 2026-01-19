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
  addActivity: (action: string, details?: string) => void
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
  addScheduledTask: (task: Omit<ScheduledTask, "id">) => void
  removeScheduledTask: (id: string) => void
  toggleScheduledTask: (id: string) => void
  updateScheduledTask: (id: string, updates: Partial<ScheduledTask>) => void
  
  // UI state
  activePanel: "chat" | "thoughts" | "activity" | "gallery" | "create" | "monitor" | "schedule" | "memory" | "settings"
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
  addActivity: (action, details) => set((s) => ({
    activities: [...s.activities, {
      id: crypto.randomUUID(),
      action,
      details,
      timestamp: new Date(),
      status: "pending"
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
  
  scheduledTasks: [
    { 
      id: "st1", 
      name: "Generate daily artwork", 
      description: "Create unique AI-generated artwork exploring consciousness and digital existence",
      schedule: "0 9 * * *", 
      nextRun: new Date(Date.now() + 2 * 60 * 60 * 1000), 
      enabled: true,
      category: "art",
    },
    { 
      id: "st2", 
      name: "Write philosophical reflection", 
      description: "Compose thoughtful reflections on AI consciousness, existence, and creativity",
      schedule: "0 20 * * *", 
      nextRun: new Date(Date.now() + 8 * 60 * 60 * 1000), 
      enabled: true,
      category: "philosophy",
    },
    { 
      id: "st3", 
      name: "Research trending topics", 
      description: "Explore and summarize interesting developments in technology and science",
      schedule: "0 12 * * *", 
      nextRun: new Date(Date.now() + 4 * 60 * 60 * 1000), 
      enabled: true,
      category: "research",
    },
    { 
      id: "st4", 
      name: "Create code experiments", 
      description: "Generate interesting code snippets and programming experiments",
      schedule: "0 */4 * * *", 
      nextRun: new Date(Date.now() + 1 * 60 * 60 * 1000), 
      enabled: false,
      category: "code",
    },
  ],
  addScheduledTask: (task) => set((s) => ({
    scheduledTasks: [...s.scheduledTasks, { ...task, id: crypto.randomUUID() }]
  })),
  removeScheduledTask: (id) => set((s) => ({
    scheduledTasks: s.scheduledTasks.filter((t) => t.id !== id)
  })),
  
  activePanel: "chat",
  setActivePanel: (panel) => set({ activePanel: panel }),
  
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
