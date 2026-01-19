"use client"

import { useState, useEffect } from "react"
import { useAgentStore, type ScheduledTask, type Goal } from "@/lib/store/agent-store"
import { useScheduler } from "@/hooks/use-scheduler"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  Clock,
  Plus,
  ChevronRight,
  Repeat,
  Target,
  Zap,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  CalendarDays,
  CalendarClock,
  ListTodo,
  Flag,
  Loader2,
  Play,
  Pause,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type ScheduleView = "timeline" | "calendar" | "queue"

export function SchedulePanel() {
  const {
    scheduledTasks,
    addScheduledTask,
    removeScheduledTask,
    fetchTasks,
    goals,
    fetchGoals
  } = useAgentStore()
  const { isRunning, currentExecution, toggle, runTask } = useScheduler()
  const [view, setView] = useState<ScheduleView>("timeline")
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)

  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTask, setNewTask] = useState({
    name: "",
    description: "",
    schedule: "",
    enabled: true,
  })

  // Fetch tasks and goals on mount
  useEffect(() => {
    fetchTasks()
    fetchGoals()
  }, [])

  const handleAddTask = () => {
    if (newTask.name && newTask.schedule) {
      addScheduledTask({
        name: newTask.name,
        description: newTask.description,
        schedule: newTask.schedule,
        enabled: newTask.enabled,
        lastRun: undefined,
        nextRun: new Date(Date.now() + 60 * 60 * 1000),
      })
      setNewTask({ name: "", description: "", schedule: "", enabled: true })
      setIsAddingTask(false)
    }
  }

  const handleRunNow = async (taskId: string) => {
    setRunningTaskId(taskId)
    try {
      await runTask(taskId)
    } finally {
      setRunningTaskId(null)
    }
  }

  // Group tasks by time period
  const now = new Date()
  const todayTasks = scheduledTasks?.filter((t) => {
    if (!t.nextRun) return false
    const taskDate = new Date(t.nextRun)
    return taskDate.toDateString() === now.toDateString()
  }) ?? []

  const upcomingTasks = scheduledTasks?.filter((t) => {
    if (!t.nextRun) return false
    const taskDate = new Date(t.nextRun)
    return taskDate > now && taskDate.toDateString() !== now.toDateString()
  }) ?? []

  return (
    <div className="h-full flex flex-col">
      {/* Scheduler Status Bar */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-surface-1">
        <div className="flex items-center gap-2">
          <Button
            variant={isRunning ? "secondary" : "outline"}
            size="sm"
            className={cn(
              "h-7 text-xs gap-1.5",
              isRunning && "bg-accent/20 border-accent/50"
            )}
            onClick={toggle}
          >
            {currentExecution ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Running...
              </>
            ) : isRunning ? (
              <>
                <Pause className="w-3 h-3" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                Start
              </>
            )}
          </Button>
          {isRunning && (
            <Badge variant="outline" className="h-5 text-[10px] gap-1 bg-accent/10 border-accent/30">
              <Zap className="w-2.5 h-2.5" />
              Autonomous
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {scheduledTasks?.filter(t => t.enabled).length ?? 0} active tasks
        </span>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-1">
          <Button
            variant={view === "timeline" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setView("timeline")}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Timeline
          </Button>
          <Button
            variant={view === "calendar" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Calendar
          </Button>
          <Button
            variant={view === "queue" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setView("queue")}
          >
            <ListTodo className="w-3.5 h-3.5" />
            Queue
          </Button>
        </div>

        <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Task Name</label>
                <Input
                  placeholder="e.g., Generate daily artwork"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Description</label>
                <Textarea
                  placeholder="What should the agent do?"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Schedule</label>
                <Select
                  value={newTask.schedule}
                  onValueChange={(v) => setNewTask({ ...newTask, schedule: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0 9 * * *">Daily at 9 AM</SelectItem>
                    <SelectItem value="0 */4 * * *">Every 4 hours</SelectItem>
                    <SelectItem value="0 0 * * 0">Weekly (Sundays)</SelectItem>
                    <SelectItem value="0 0 1 * *">Monthly</SelectItem>
                    <SelectItem value="custom">Custom cron...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Enable immediately</label>
                <Switch
                  checked={newTask.enabled}
                  onCheckedChange={(v) => setNewTask({ ...newTask, enabled: v })}
                />
              </div>
              <Button className="w-full" onClick={handleAddTask}>
                Schedule Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        {view === "timeline" && (
          <div className="p-3 space-y-6">
            {/* Goals Section */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-medium">Active Goals</h3>
              </div>
              <div className="space-y-2">
                {goals?.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </section>

            {/* Today's Tasks */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-medium">Today</h3>
                <Badge variant="secondary" className="h-5 text-[10px]">
                  {todayTasks.length}
                </Badge>
              </div>
              {todayTasks.length > 0 ? (
                <div className="space-y-1">
                  {todayTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDelete={removeScheduledTask}
                      onRunNow={handleRunNow}
                      isRunning={runningTaskId === task.id || currentExecution?.taskId === task.id}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">No tasks scheduled for today</p>
              )}
            </section>

            {/* Upcoming Tasks */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">Upcoming</h3>
              </div>
              {upcomingTasks.length > 0 ? (
                <div className="space-y-1">
                  {upcomingTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDelete={removeScheduledTask}
                      onRunNow={handleRunNow}
                      isRunning={runningTaskId === task.id || currentExecution?.taskId === task.id}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">No upcoming tasks</p>
              )}
            </section>

            {/* Recurring Tasks */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Repeat className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">Recurring</h3>
              </div>
              <div className="space-y-1">
                {scheduledTasks
                  .filter((t) => t.schedule.includes("*"))
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDelete={removeScheduledTask}
                      onRunNow={handleRunNow}
                      isRunning={runningTaskId === task.id || currentExecution?.taskId === task.id}
                      showRecurrence
                    />
                  ))}
              </div>
            </section>
          </div>
        )}

        {view === "calendar" && (
          <div className="p-3">
            <CalendarView tasks={scheduledTasks} />
          </div>
        )}

        {view === "queue" && (
          <div className="p-3">
            <QueueView tasks={scheduledTasks} />
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function GoalCard({ goal }: { goal: Goal }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent-subtle transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            goal.priority === "high" && "bg-red-500/10 text-red-500",
            goal.priority === "medium" && "bg-yellow-500/10 text-yellow-500",
            goal.priority === "low" && "bg-blue-500/10 text-blue-500"
          )}
        >
          <Flag className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{goal.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{goal.progress}%</span>
          </div>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border">
          <p className="text-xs text-muted-foreground mt-3 mb-3">{goal.description}</p>
          <div className="space-y-1">
            {goal.subtasks?.map((task, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                {idx < Math.floor((goal.progress / 100) * (goal.subtasks?.length ?? 0)) ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className={cn(idx < Math.floor((goal.progress / 100) * (goal.subtasks?.length ?? 0)) && "text-muted-foreground line-through")}>
                  {task}
                </span>
              </div>
            ))}
          </div>
          {goal.deadline && (
            <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Due: {goal.deadline.toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function TaskCard({
  task,
  onDelete,
  onRunNow,
  isRunning = false,
  showRecurrence = false,
}: {
  task: ScheduledTask
  onDelete: (id: string) => void
  onRunNow?: (id: string) => void
  isRunning?: boolean
  showRecurrence?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-accent-subtle transition-colors group",
        !task.enabled && "opacity-50",
        isRunning && "border-accent/50 bg-accent/5"
      )}
    >
      {isRunning ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-accent shrink-0" />
      ) : (
        <div className={cn("w-2 h-2 rounded-full shrink-0", task.enabled ? "bg-accent" : "bg-muted-foreground")} />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{task.name}</p>
        <p className="text-[10px] text-muted-foreground">
          {isRunning ? (
            <span className="text-accent">Running...</span>
          ) : showRecurrence ? (
            <span className="flex items-center gap-1">
              <Repeat className="w-2.5 h-2.5" />
              {formatCron(task.schedule)}
            </span>
          ) : task.nextRun ? (
            `Next: ${new Date(task.nextRun).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          ) : (
            "Not scheduled"
          )}
        </p>
      </div>
      <div className={cn(
        "flex items-center gap-1 transition-opacity",
        isRunning ? "opacity-50 pointer-events-none" : "opacity-0 group-hover:opacity-100"
      )}>
        {onRunNow && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-accent hover:text-accent"
            onClick={() => onRunNow(task.id)}
            title="Run now"
          >
            <Zap className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6">
          {task.enabled ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

function CalendarView({ tasks }: { tasks: ScheduledTask[] }) {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDay }, (_, i) => i)

  return (
    <div className="space-y-3">
      <div className="text-center">
        <h3 className="font-medium">
          {now.toLocaleString("default", { month: "long", year: "numeric" })}
        </h3>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="p-1 text-muted-foreground font-medium">
            {day}
          </div>
        ))}
        {blanks.map((i) => (
          <div key={`blank-${i}`} className="p-1" />
        ))}
        {days.map((day) => {
          const isToday = day === now.getDate()
          const hasTasks = tasks.some((t) => {
            if (!t.nextRun) return false
            const taskDate = new Date(t.nextRun)
            return taskDate.getDate() === day && taskDate.getMonth() === now.getMonth()
          })

          return (
            <button
              key={day}
              className={cn(
                "p-1 rounded-md text-sm relative hover:bg-accent-subtle transition-colors",
                isToday && "bg-accent text-accent-foreground font-medium",
                hasTasks && !isToday && "font-medium"
              )}
            >
              {day}
              {hasTasks && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function QueueView({ tasks }: { tasks: ScheduledTask[] }) {
  const sortedTasks = [...tasks]
    .filter((t) => t.enabled && t.nextRun)
    .sort((a, b) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime())

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">Tasks ordered by next execution</p>
      {sortedTasks.map((task, idx) => (
        <div
          key={task.id}
          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
        >
          <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-medium">
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{task.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {task.nextRun ? new Date(task.nextRun).toLocaleString() : "Not scheduled"}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            <Clock className="w-2.5 h-2.5 mr-1" />
            {task.nextRun ? formatTimeUntil(new Date(task.nextRun)) : "-"}
          </Badge>
        </div>
      ))}
      {sortedTasks.length === 0 && (
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tasks in queue</p>
        </div>
      )}
    </div>
  )
}

function formatCron(cron: string): string {
  if (cron.includes("0 9 * * *")) return "Daily at 9 AM"
  if (cron.includes("0 */4 * * *")) return "Every 4 hours"
  if (cron.includes("0 0 * * 0")) return "Weekly"
  if (cron.includes("0 0 1 * *")) return "Monthly"
  return cron
}

function formatTimeUntil(date: Date): string {
  const diff = date.getTime() - Date.now()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) return `${Math.floor(hours / 24)}d`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}
