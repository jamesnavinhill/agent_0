"use client"

import { useState } from "react"
import { useSubAgents } from "@/hooks/use-sub-agents"
import { useAgentExecution } from "@/hooks/use-agent-execution"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
    Users,
    Bot,
    Search,
    Palette,
    Code,
    ClipboardCheck,
    Loader2,
    CheckCircle,
    AlertCircle,
    Clock,
    XCircle,
    Trash2,
    BarChart3,
    Play,
    Square,
    Wrench,
    Eye,
    ChevronDown,
    ChevronRight,
    Zap,
    Brain,
} from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

/**
 * Role icons mapping
 */
const roleIcons: Record<string, React.ElementType> = {
    researcher: Search,
    creator: Palette,
    executor: Code,
    reviewer: ClipboardCheck,
    orchestrator: Brain,
}

/**
 * Status icons and colors
 */
const statusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
    idle: { icon: Clock, color: "text-muted-foreground", bgColor: "bg-muted/50" },
    working: { icon: Loader2, color: "text-accent", bgColor: "bg-accent/10" },
    complete: { icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-500/10" },
    error: { icon: AlertCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
}

export function SubAgentsPanel() {
    const {
        activeAgents,
        completedAgents,
        isSpawning,
        cancel: cancelLegacy,
        clearHistory,
        canSpawn,
        stats,
    } = useSubAgents()

    const {
        isExecuting,
        steps,
        toolCalls,
        subAgents: executionSubAgents,
        result,
        error,
        execute,
        cancel: cancelExecution,
        reset,
    } = useAgentExecution()

    const [taskInput, setTaskInput] = useState("")
    const [selectedRole, setSelectedRole] = useState<string>("orchestrator")
    const [showSteps, setShowSteps] = useState(true)
    const [showToolCalls, setShowToolCalls] = useState(true)

    const handleExecute = async () => {
        if (!taskInput.trim()) return
        await execute(taskInput, { autonomous: selectedRole === "orchestrator" })
        setTaskInput("")
    }

    // Combine legacy agents with execution sub-agents
    const allActiveAgents = [
        ...activeAgents,
        ...executionSubAgents.filter(sa => sa.status === "working"),
    ]

    const allCompletedAgents = [
        ...completedAgents,
        ...executionSubAgents.filter(sa => sa.status === "complete" || sa.status === "error"),
    ]

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium">Agents</span>
                    {(allActiveAgents.length > 0 || isExecuting) && (
                        <Badge variant="outline" className="h-5 text-[10px] gap-1 bg-accent/10 border-accent/30">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            {isExecuting ? "Running" : `${allActiveAgents.length} active`}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => { reset(); clearHistory(); }}
                                    disabled={allCompletedAgents.length === 0 && steps.length === 0}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Clear history</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Quick Execute Bar */}
            <div className="p-3 border-b border-border bg-surface-1 space-y-2">
                <div className="flex items-center gap-2">
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="orchestrator">
                                <div className="flex items-center gap-1.5">
                                    <Brain className="w-3 h-3" />
                                    <span>Orchestrator</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="researcher">
                                <div className="flex items-center gap-1.5">
                                    <Search className="w-3 h-3" />
                                    <span>Researcher</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="creator">
                                <div className="flex items-center gap-1.5">
                                    <Palette className="w-3 h-3" />
                                    <span>Creator</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="reviewer">
                                <div className="flex items-center gap-1.5">
                                    <ClipboardCheck className="w-3 h-3" />
                                    <span>Reviewer</span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        value={taskInput}
                        onChange={(e) => setTaskInput(e.target.value)}
                        placeholder="Enter a task..."
                        className="h-8 text-xs flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleExecute()}
                        disabled={isExecuting}
                    />
                    {isExecuting ? (
                        <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={cancelExecution}
                        >
                            <Square className="w-3.5 h-3.5" />
                        </Button>
                    ) : (
                        <Button
                            variant="default"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleExecute}
                            disabled={!taskInput.trim()}
                        >
                            <Play className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-4 px-4 py-2 bg-surface-1 border-b border-border text-xs">
                <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Pool:</span>
                    <span className="font-medium">{stats.activeCount}/{stats.maxAgents}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-muted-foreground">Success:</span>
                    <span className="font-medium">{(stats.successRate * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Tools:</span>
                    <span className="font-medium">{toolCalls.length}</span>
                </div>
            </div>

            {/* Main Content */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {/* Execution Visibility - Steps */}
                    {steps.length > 0 && (
                        <Collapsible open={showSteps} onOpenChange={setShowSteps}>
                            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-full">
                                {showSteps ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                <Eye className="w-3 h-3" />
                                Execution Steps ({steps.length})
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2 space-y-1.5">
                                {steps.slice(-10).map((step, idx) => (
                                    <div
                                        key={`step-${idx}`}
                                        className={cn(
                                            "p-2 rounded-md text-xs border",
                                            step.type === "tool-call" && "bg-accent/5 border-accent/20",
                                            step.type === "tool-result" && "bg-green-500/5 border-green-500/20",
                                            step.type === "text" && "bg-surface-1 border-border"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="h-4 text-[9px] px-1">
                                                Step {step.stepNumber}
                                            </Badge>
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "h-4 text-[9px] px-1",
                                                    step.type === "tool-call" && "bg-accent/20 text-accent",
                                                    step.type === "tool-result" && "bg-green-500/20 text-green-500"
                                                )}
                                            >
                                                {step.type}
                                            </Badge>
                                            {step.toolName && (
                                                <span className="text-muted-foreground font-mono text-[10px]">
                                                    {step.toolName}
                                                </span>
                                            )}
                                        </div>
                                        {step.content && (
                                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                                                {step.content}
                                            </p>
                                        )}
                                        {step.toolInput && (
                                            <pre className="text-[10px] text-muted-foreground mt-1 p-1 bg-muted/30 rounded overflow-x-auto">
                                                {JSON.stringify(step.toolInput, null, 2).slice(0, 200)}
                                            </pre>
                                        )}
                                    </div>
                                ))}
                            </CollapsibleContent>
                        </Collapsible>
                    )}

                    {/* Tool Calls */}
                    {toolCalls.length > 0 && (
                        <Collapsible open={showToolCalls} onOpenChange={setShowToolCalls}>
                            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-full">
                                {showToolCalls ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                <Wrench className="w-3 h-3" />
                                Tool Calls ({toolCalls.length})
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2 space-y-1.5">
                                {toolCalls.map((tc) => (
                                    <div
                                        key={tc.id}
                                        className="p-2 rounded-md text-xs border bg-surface-1 border-border"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Zap className="w-3 h-3 text-accent" />
                                                <span className="font-mono font-medium">{tc.name}</span>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "h-4 text-[9px]",
                                                    tc.status === "complete" && "text-green-500 border-green-500/30",
                                                    tc.status === "error" && "text-destructive border-destructive/30",
                                                    tc.status === "executing" && "text-accent border-accent/30"
                                                )}
                                            >
                                                {tc.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </CollapsibleContent>
                        </Collapsible>
                    )}

                    {/* Active Agents Section */}
                    {allActiveAgents.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Active ({allActiveAgents.length})
                            </h3>
                            {allActiveAgents.map((agent) => {
                                const RoleIcon = roleIcons[agent.role] || Bot
                                const StatusConfig = statusConfig[agent.status] || statusConfig.idle
                                const StatusIcon = StatusConfig.icon

                                return (
                                    <div
                                        key={agent.id}
                                        className={cn(
                                            "p-3 rounded-lg border border-border",
                                            StatusConfig.bgColor
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={cn("p-1.5 rounded", StatusConfig.bgColor)}>
                                                    <RoleIcon className={cn("w-4 h-4", StatusConfig.color)} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{agent.name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {agent.task}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <StatusIcon
                                                    className={cn(
                                                        "w-4 h-4",
                                                        StatusConfig.color,
                                                        agent.status === "working" && "animate-spin"
                                                    )}
                                                />
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => cancelLegacy(agent.id)}
                                                            >
                                                                <XCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Cancel</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                        {agent.progress !== undefined && (
                                            <Progress value={agent.progress} className="h-1 mt-2" />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Completed Agents Section */}
                    {allCompletedAgents.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Completed ({allCompletedAgents.length})
                            </h3>
                            {allCompletedAgents.slice(0, 10).map((agent) => {
                                const RoleIcon = roleIcons[agent.role] || Bot
                                const StatusConfig = statusConfig[agent.status] || statusConfig.complete
                                const StatusIcon = StatusConfig.icon

                                return (
                                    <div
                                        key={agent.id}
                                        className="p-3 rounded-lg border border-border bg-surface-1/50"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="p-1.5 rounded bg-muted/30">
                                                    <RoleIcon className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate text-muted-foreground">
                                                        {agent.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground/70 truncate">
                                                        {agent.task}
                                                    </p>
                                                </div>
                                            </div>
                                            <StatusIcon className={cn("w-4 h-4", StatusConfig.color)} />
                                        </div>
                                        {agent.error && (
                                            <p className="text-xs text-destructive mt-1 truncate">
                                                {agent.error}
                                            </p>
                                        )}
                                        {agent.completedAt && (
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                {new Date(agent.completedAt).toLocaleTimeString()}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Result Display */}
                    {result && (
                        <div className={cn(
                            "p-3 rounded-lg border",
                            result.success ? "bg-green-500/5 border-green-500/20" : "bg-destructive/5 border-destructive/20"
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                {result.success ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-destructive" />
                                )}
                                <span className="text-sm font-medium">
                                    {result.success ? "Execution Complete" : "Execution Failed"}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>{result.duration}ms</span>
                                <span>{result.stepCount} steps</span>
                                <span>{result.toolCallCount} tool calls</span>
                            </div>
                            {result.result && (
                                <p className="text-xs mt-2 text-muted-foreground line-clamp-4">
                                    {result.result}
                                </p>
                            )}
                            {result.error && (
                                <p className="text-xs mt-2 text-destructive">
                                    {result.error}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Empty State */}
                    {allActiveAgents.length === 0 && allCompletedAgents.length === 0 && steps.length === 0 && !result && (
                        <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                            <Brain className="w-10 h-10 mb-3 opacity-40" />
                            <p className="text-sm font-medium">AI SDK Agents Ready</p>
                            <p className="text-xs mt-1">
                                Enter a task above to execute with the orchestrator or specialized sub-agents
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Footer Status */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-surface-1 text-xs">
                <div className="flex items-center gap-2">
                    <div
                        className={cn(
                            "w-2 h-2 rounded-full",
                            canSpawn && !isExecuting ? "bg-green-500" : "bg-yellow-500"
                        )}
                    />
                    <span className="text-muted-foreground">
                        {isExecuting ? "Executing..." : canSpawn ? "Ready" : "Pool at capacity"}
                    </span>
                </div>
                {isExecuting && (
                    <div className="flex items-center gap-1 text-accent">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Step {steps.length}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
