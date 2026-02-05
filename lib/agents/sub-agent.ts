/**
 * Sub-Agent Execution Logic
 * Each sub-agent gets its own context and reports progress back to parent
 */

import {
    SubAgent,
    SubAgentRole,
    SubAgentStatus,
    SpawnSubAgentConfig,
    SubAgentResult,
    SubAgentEventCallback,
    SubAgentEvent
} from "./types"
import { generateText as geminiGenerateText } from "@/lib/api/gemini"
import { logger } from "@/lib/logging/logger"
import { createId } from "@/lib/utils/id"

/**
 * Role-specific system prompts for sub-agents
 */
const ROLE_PROMPTS: Record<SubAgentRole, string> = {
    researcher: `You are a research specialist agent. Your job is to:
- Gather and synthesize information on the given topic
- Provide accurate, well-sourced insights
- Summarize findings clearly and concisely
- Highlight key takeaways and actionable insights`,

    creator: `You are a creative specialist agent. Your job is to:
- Generate high-quality creative content
- Be original and imaginative
- Follow any style or format guidelines provided
- Produce polished, publication-ready output`,

    executor: `You are an execution specialist agent. Your job is to:
- Perform the requested action precisely
- Report progress and results clearly
- Handle errors gracefully
- Complete tasks efficiently`,

    reviewer: `You are a review specialist agent. Your job is to:
- Analyze and critique the provided content
- Identify areas for improvement
- Provide constructive feedback
- Ensure quality and accuracy`,

    coder: `You are a software development specialist agent. Your job is to:
- Write clean, well-structured code in the sandbox environment
- Create projects with proper file organization
- Set up dependencies and build configurations
- Run and test code, iterating based on results
- Document your code and learnings`,
}

/**
 * Create a new sub-agent instance
 */
export function createSubAgent(config: SpawnSubAgentConfig): SubAgent {
    return {
        id: createId(),
        name: config.name,
        role: config.role,
        status: "idle",
        task: config.task,
        progress: 0,
        startedAt: new Date(),
    }
}

/**
 * Execute a sub-agent's task
 * This is the core execution logic for sub-agents
 */
export async function executeSubAgent(
    agent: SubAgent,
    context: Record<string, unknown> = {},
    onEvent?: SubAgentEventCallback
): Promise<SubAgentResult> {
    const startTime = Date.now()

    // Update status to working
    agent.status = "working"
    agent.progress = 0

    emitEvent(onEvent, { type: "spawned", agent, timestamp: new Date() })

    logger.info(`Sub-agent ${agent.name} (${agent.role}) starting task: ${agent.task}`, {
        source: "sub-agent",
        agentId: agent.id,
    })

    try {
        // Build the prompt for this sub-agent
        const systemPrompt = ROLE_PROMPTS[agent.role]
        const userPrompt = buildTaskPrompt(agent, context)

        // Update progress
        agent.progress = 25
        emitEvent(onEvent, { type: "progress", agent, timestamp: new Date() })

        // Execute via Gemini - systemInstruction goes in config, user prompt is first arg
        const result = await geminiGenerateText(userPrompt, {
            systemInstruction: systemPrompt,
        })

        agent.progress = 75
        emitEvent(onEvent, { type: "progress", agent, timestamp: new Date() })

        // Mark as complete
        agent.status = "complete"
        agent.progress = 100
        agent.result = result
        agent.completedAt = new Date()

        emitEvent(onEvent, { type: "completed", agent, timestamp: new Date() })

        logger.info(`Sub-agent ${agent.name} completed successfully`, {
            source: "sub-agent",
            agentId: agent.id,
            duration: Date.now() - startTime,
        })

        return {
            agentId: agent.id,
            role: agent.role,
            success: true,
            result: result,
            duration: Date.now() - startTime,
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)

        agent.status = "error"
        agent.error = errorMessage
        agent.completedAt = new Date()

        emitEvent(onEvent, { type: "error", agent, timestamp: new Date() })

        logger.error(`Sub-agent ${agent.name} failed: ${errorMessage}`, {
            source: "sub-agent",
            agentId: agent.id,
        })

        return {
            agentId: agent.id,
            role: agent.role,
            success: false,
            error: errorMessage,
            duration: Date.now() - startTime,
        }
    }
}

/**
 * Build the task prompt for a sub-agent
 */
function buildTaskPrompt(agent: SubAgent, context: Record<string, unknown>): string {
    let prompt = `## Task\n${agent.task}\n\n`

    if (Object.keys(context).length > 0) {
        prompt += `## Context\n`
        for (const [key, value] of Object.entries(context)) {
            if (typeof value === "string") {
                prompt += `**${key}:** ${value}\n`
            } else {
                prompt += `**${key}:** ${JSON.stringify(value)}\n`
            }
        }
    }

    prompt += `\nProvide a thorough and actionable response for your specialized role.`

    return prompt
}

/**
 * Helper to emit events if callback is provided
 */
function emitEvent(callback: SubAgentEventCallback | undefined, event: SubAgentEvent): void {
    if (callback) {
        try {
            callback(event)
        } catch (err) {
            logger.error("Error in sub-agent event callback", { source: "sub-agent" })
        }
    }
}

/**
 * Update a sub-agent's progress
 */
export function updateSubAgentProgress(agent: SubAgent, progress: number): void {
    agent.progress = Math.min(100, Math.max(0, progress))
}

/**
 * Check if a sub-agent can be retried
 */
export function canRetrySubAgent(agent: SubAgent): boolean {
    return agent.status === "error"
}
