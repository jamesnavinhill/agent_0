"use client"

import { useState, useEffect } from "react"
import { useSubAgents } from "@/hooks/use-sub-agents"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
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
} from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Role icons mapping
 */
const roleIcons: Record<string, React.ElementType> = {
    researcher: Search,
    creator: Palette,
    executor: Code,
    reviewer: ClipboardCheck,
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
        cancel,
        clearHistory,
        canSpawn,
        stats,
    } = useSubAgents()

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium">Sub-Agents</span>
                    {activeAgents.length > 0 && (
                        <Badge variant="outline" className="h-5 text-[10px] gap-1 bg-accent/10 border-accent/30">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            {activeAgents.length} active
                        </Badge>
                    )}
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={clearHistory}
                                disabled={completedAgents.length === 0}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clear history</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
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
                    <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="font-medium">{stats.completedCount}</span>
                </div>
            </div>

            {/* Agent List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                    {/* Active Agents Section */}
                    {activeAgents.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Active ({activeAgents.length})
                            </h3>
                            {activeAgents.map((agent) => {
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
                                                                onClick={() => cancel(agent.id)}
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
                    {completedAgents.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Completed ({completedAgents.length})
                            </h3>
                            {completedAgents.map((agent) => {
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

                    {/* Empty State */}
                    {activeAgents.length === 0 && completedAgents.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                            <Users className="w-10 h-10 mb-3 opacity-40" />
                            <p className="text-sm font-medium">No sub-agents</p>
                            <p className="text-xs mt-1">
                                Sub-agents will appear here when spawned for complex tasks
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
                            canSpawn ? "bg-green-500" : "bg-yellow-500"
                        )}
                    />
                    <span className="text-muted-foreground">
                        {canSpawn ? "Pool available" : "Pool at capacity"}
                    </span>
                </div>
                {isSpawning && (
                    <div className="flex items-center gap-1 text-accent">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Spawning...</span>
                    </div>
                )}
            </div>
        </div>
    )
}
