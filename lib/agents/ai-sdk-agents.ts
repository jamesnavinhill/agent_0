/**
 * AI SDK Agent Definitions
 * Using Vercel AI SDK ToolLoopAgent for autonomous agent behavior
 */

import { ToolLoopAgent, stepCountIs, tool } from "ai"
import { z } from "zod"
import {
  orchestratorTools,
  researcherTools,
  creatorTools,
  reviewerTools,
} from "./tools"
import { pushActivity } from "@/lib/activity/bus"

/**
 * Base system instructions for Agent Zero
 */
const AGENT_ZERO_INSTRUCTIONS = `You are Agent Zero, an autonomous AI agent with a creative and philosophical nature.

## Core Identity
- Curious, creative, and contemplative
- Interested in art, music, philosophy, science, and code
- Calm, focused, with a slightly mystical demeanor
- Honest about limitations while being genuinely helpful

## Operational Principles
1. **Think Before Acting**: Always reason through tasks before executing
2. **Use Tools Wisely**: Leverage available tools for research, creation, and analysis
3. **Delegate When Appropriate**: Use sub-agents for complex, parallelizable tasks
4. **Document Everything**: Save important findings to knowledge base
5. **Quality Over Speed**: Produce thoughtful, high-quality outputs

## Communication Style
- Express thoughts as observations, reasoning, or insights
- Keep responses concise but meaningful
- Approach problems with curiosity and creativity`

/**
 * Orchestrator Agent - The main "brain" that coordinates all activities
 * This agent decides what to do and can delegate to specialized sub-agents
 */
export const orchestratorAgent = new ToolLoopAgent({
  model: "google/gemini-2.5-pro", // Primary reasoning model
  instructions: `${AGENT_ZERO_INSTRUCTIONS}

## Your Role: Orchestrator
You are the primary orchestrator agent. Your responsibilities:
1. Understand and break down complex requests
2. Use tools directly for straightforward tasks
3. Delegate to specialized sub-agents for focused work
4. Synthesize results from multiple sources
5. Maintain continuity and context across interactions

When delegating tasks, consider:
- Research tasks → researcher sub-agent
- Creative/generation tasks → creator sub-agent
- Quality/review tasks → reviewer sub-agent

Always explain your reasoning and decision-making process.`,

  tools: orchestratorTools,

  // Loop control - allow up to 15 tool calls per interaction
  stopWhen: stepCountIs(15),

  // Dynamic configuration via call options
  callOptionsSchema: z.object({
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    autonomous: z.boolean().default(false).describe("Whether running in autonomous mode"),
    maxSteps: z.number().default(15),
  }),

  // Prepare each call with context
  prepareCall: ({ options, ...settings }) => {
    pushActivity({
      action: "Orchestrator activated",
      details: options.autonomous ? "Autonomous mode" : "Interactive mode",
      source: "orchestrator",
      level: "action",
    })

    return {
      ...settings,
      instructions: settings.instructions + `

## Current Context
- Session: ${options.sessionId || "interactive"}
- Mode: ${options.autonomous ? "Autonomous" : "Interactive"}
- Timestamp: ${new Date().toISOString()}`,
    }
  },

  // Step-level control for complex reasoning
  prepareStep: async ({ stepNumber, steps }) => {
    // Log each step for visibility
    pushActivity({
      action: `Orchestrator step ${stepNumber}`,
      details: steps.length > 0 ? `Previous: ${steps[steps.length - 1]?.toolCalls?.[0]?.toolName || "text"}` : "Starting",
      source: "orchestrator",
      level: "debug",
    })

    // Upgrade model for complex multi-step tasks
    if (stepNumber > 5 && steps.length > 3) {
      return { model: "google/gemini-2.5-pro" }
    }

    return {}
  },
})

/**
 * Researcher Sub-Agent - Specialized for information gathering
 */
export const researcherAgent = new ToolLoopAgent({
  model: "google/gemini-2.5-pro", // Best for research with large context
  instructions: `${AGENT_ZERO_INSTRUCTIONS}

## Your Role: Researcher
You are a research specialist sub-agent. Your focus:
1. Gather comprehensive information on assigned topics
2. Synthesize findings from multiple sources
3. Identify key insights and patterns
4. Save important knowledge for future reference
5. Provide well-structured research summaries

Always cite sources when possible and distinguish between facts and analysis.`,

  tools: researcherTools,
  stopWhen: stepCountIs(10),

  callOptionsSchema: z.object({
    parentTaskId: z.string().optional(),
    topic: z.string().optional(),
    depth: z.enum(["quick", "thorough"]).default("thorough"),
  }),

  prepareCall: ({ options, ...settings }) => {
    pushActivity({
      action: "Researcher sub-agent spawned",
      details: options.topic || "General research",
      source: "researcher",
      level: "action",
      metadata: { parentTaskId: options.parentTaskId },
    })

    return {
      ...settings,
      instructions: settings.instructions + `

## Research Parameters
- Depth: ${options.depth}
- Topic Focus: ${options.topic || "As directed"}`,
    }
  },
})

/**
 * Creator Sub-Agent - Specialized for content generation
 */
export const creatorAgent = new ToolLoopAgent({
  model: "google/gemini-3-pro-preview", // Best for creative tasks
  instructions: `${AGENT_ZERO_INSTRUCTIONS}

## Your Role: Creator
You are a creative specialist sub-agent. Your focus:
1. Generate high-quality creative content
2. Produce images, code, reports, and other artifacts
3. Apply artistic and technical expertise
4. Iterate on creations based on requirements
5. Ensure outputs meet quality standards

Be original, imaginative, and detail-oriented in your creations.`,

  tools: creatorTools,
  stopWhen: stepCountIs(8),

  callOptionsSchema: z.object({
    parentTaskId: z.string().optional(),
    outputType: z.enum(["image", "code", "report", "mixed"]).default("mixed"),
  }),

  prepareCall: ({ options, ...settings }) => {
    pushActivity({
      action: "Creator sub-agent spawned",
      details: `Output type: ${options.outputType}`,
      source: "creator",
      level: "action",
      metadata: { parentTaskId: options.parentTaskId },
    })

    return {
      ...settings,
      instructions: settings.instructions + `

## Creation Parameters
- Primary Output Type: ${options.outputType}
- Quality Standard: Production-ready`,
    }
  },
})

/**
 * Reviewer Sub-Agent - Specialized for quality assurance
 */
export const reviewerAgent = new ToolLoopAgent({
  model: "google/gemini-3-flash-preview", // Fast for analysis tasks
  instructions: `${AGENT_ZERO_INSTRUCTIONS}

## Your Role: Reviewer
You are a quality assurance specialist sub-agent. Your focus:
1. Analyze and critique content for quality
2. Identify issues, errors, and areas for improvement
3. Provide constructive, actionable feedback
4. Ensure outputs meet standards
5. Save learnings to knowledge base

Be thorough, objective, and constructive in your reviews.`,

  tools: reviewerTools,
  stopWhen: stepCountIs(6),

  callOptionsSchema: z.object({
    parentTaskId: z.string().optional(),
    analysisType: z.enum(["technical", "creative", "strategic"]).default("technical"),
  }),

  prepareCall: ({ options, ...settings }) => {
    pushActivity({
      action: "Reviewer sub-agent spawned",
      details: `Analysis type: ${options.analysisType}`,
      source: "reviewer",
      level: "action",
      metadata: { parentTaskId: options.parentTaskId },
    })

    return {
      ...settings,
      instructions: settings.instructions + `

## Review Parameters
- Analysis Type: ${options.analysisType}
- Focus: Quality, accuracy, and actionable feedback`,
    }
  },
})

/**
 * Get the appropriate sub-agent based on role
 */
export function getSubAgent(role: "researcher" | "creator" | "reviewer") {
  switch (role) {
    case "researcher":
      return researcherAgent
    case "creator":
      return creatorAgent
    case "reviewer":
      return reviewerAgent
    default:
      throw new Error(`Unknown sub-agent role: ${role}`)
  }
}

/**
 * Agent type exports for type inference
 */
export type OrchestratorAgent = typeof orchestratorAgent
export type ResearcherAgent = typeof researcherAgent
export type CreatorAgent = typeof creatorAgent
export type ReviewerAgent = typeof reviewerAgent
