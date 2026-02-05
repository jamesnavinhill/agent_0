/**
 * AI SDK Tool Definitions
 * Centralized tool registry for all agent capabilities
 */

import { tool } from "ai"
import { z } from "zod"
import { generateImage as imagenGenerateImage } from "@/lib/api/imagen"
import { generateText } from "@/lib/api/gemini"
import { addKnowledge } from "@/lib/db/knowledge"
import { saveGalleryItem } from "@/lib/db/gallery"
import { pushActivity } from "@/lib/activity/bus"
import { sandboxTool } from "./sandbox"

/**
 * Research Tool - Web search and knowledge gathering
 */
export const researchTool = tool({
  description: "Search the web and gather information on a topic. Returns synthesized research findings.",
  inputSchema: z.object({
    query: z.string().describe("The search query or research topic"),
    depth: z.enum(["quick", "thorough"]).default("quick").describe("Research depth - quick for fast results, thorough for comprehensive analysis"),
  }),
  execute: async function* ({ query, depth }) {
    yield { state: "searching" as const, message: `Searching for: ${query}` }

    pushActivity({
      action: "Research started",
      details: query,
      source: "research-tool",
      level: "action",
    })

    // Use Gemini with search grounding for research
    const systemPrompt = `You are a research specialist. Search and synthesize information on the given topic.
Be thorough, accurate, and cite sources when possible.
Format your findings clearly with key takeaways.`

    const prompt = depth === "thorough"
      ? `Conduct comprehensive research on: ${query}\n\nProvide detailed findings with multiple perspectives and sources.`
      : `Quick research on: ${query}\n\nProvide a concise summary of key findings.`

    yield { state: "analyzing" as const, message: "Analyzing search results..." }

    const result = await generateText(prompt, {
      systemInstruction: systemPrompt,
      model: "gemini-2.5-pro", // Use 2.5 Pro for research (better grounding)
    })

    yield {
      state: "complete" as const,
      findings: result,
      query,
      depth,
    }
  },
})

/**
 * Image Generation Tool
 */
export const imageGenerationTool = tool({
  description: "Generate an image based on a text prompt using AI image generation",
  inputSchema: z.object({
    prompt: z.string().describe("Detailed description of the image to generate"),
    style: z.string().optional().describe("Optional style modifier (e.g., 'photorealistic', 'artistic', 'abstract')"),
    aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("16:9").describe("Aspect ratio of the image"),
  }),
  execute: async function* ({ prompt, style, aspectRatio }) {
    yield { state: "generating" as const, message: "Generating image..." }

    pushActivity({
      action: "Image generation started",
      details: prompt,
      source: "image-tool",
      level: "action",
    })

    const fullPrompt = style ? `${prompt}, ${style} style` : prompt

    try {
      const result = await imagenGenerateImage(fullPrompt, { aspectRatio })

      // Save to gallery
      if (result.url) {
        await saveGalleryItem({
          type: "image",
          content: result.url,
          title: prompt.slice(0, 100),
          prompt: fullPrompt,
          category: "art",
          metadata: { aspectRatio, style, model: "gemini-2.5-flash-image" },
        })
      }

      yield {
        state: "complete" as const,
        imageUrl: result.url,
        prompt: fullPrompt,
      }
    } catch (error) {
      yield {
        state: "error" as const,
        error: error instanceof Error ? error.message : "Image generation failed",
      }
    }
  },
})

/**
 * Knowledge Storage Tool - Save important findings to long-term memory
 */
export const knowledgeTool = tool({
  description: "Save important information to the agent's knowledge base for future reference",
  inputSchema: z.object({
    title: z.string().describe("Concise title for this knowledge entry"),
    summary: z.string().describe("Detailed summary of the knowledge"),
    url: z.string().optional().describe("Source URL if applicable"),
    tags: z.array(z.string()).describe("Relevant tags for categorization"),
  }),
  execute: async ({ title, summary, url, tags }) => {
    pushActivity({
      action: "Saving knowledge",
      details: title,
      source: "knowledge-tool",
      level: "info",
    })

    const success = await addKnowledge({ title, summary, url: url ?? undefined, tags })

    return {
      success,
      message: success ? `Knowledge saved: ${title}` : "Failed to save knowledge",
    }
  },
})

/**
 * Code Generation Tool
 */
export const codeGenerationTool = tool({
  description: "Generate code based on requirements",
  inputSchema: z.object({
    description: z.string().describe("Description of what the code should do"),
    language: z.enum(["typescript", "javascript", "python", "rust", "go"]).default("typescript"),
    framework: z.string().optional().describe("Optional framework context (e.g., 'React', 'Next.js', 'FastAPI')"),
  }),
  execute: async function* ({ description, language, framework }) {
    yield { state: "thinking" as const, message: "Planning code structure..." }

    pushActivity({
      action: "Code generation started",
      details: description,
      source: "code-tool",
      level: "action",
    })

    const systemPrompt = `You are an expert ${language} developer${framework ? ` specializing in ${framework}` : ""}.
Generate clean, well-documented, production-ready code.
Include comments explaining key decisions.
Follow best practices for the language and framework.`

    yield { state: "generating" as const, message: "Writing code..." }

    const result = await generateText(
      `Generate ${language} code for the following:\n\n${description}`,
      { systemInstruction: systemPrompt, model: "gemini-3-pro-preview" }
    )

    yield {
      state: "complete" as const,
      code: result,
      language,
      framework,
    }
  },
})

/**
 * Analysis Tool - Analyze content, data, or situations
 */
export const analysisTool = tool({
  description: "Analyze content, data, images, or situations and provide insights",
  inputSchema: z.object({
    content: z.string().describe("The content to analyze"),
    analysisType: z.enum(["sentiment", "technical", "creative", "strategic"]).describe("Type of analysis to perform"),
    context: z.string().optional().describe("Additional context for the analysis"),
  }),
  execute: async function* ({ content, analysisType, context }) {
    yield { state: "analyzing" as const, message: `Performing ${analysisType} analysis...` }

    pushActivity({
      action: `${analysisType} analysis started`,
      details: content.slice(0, 100),
      source: "analysis-tool",
      level: "action",
    })

    const prompts: Record<string, string> = {
      sentiment: "Analyze the sentiment, emotions, and tone of the following content. Identify positive, negative, and neutral aspects.",
      technical: "Perform a technical analysis of the following content. Identify strengths, weaknesses, potential issues, and suggestions for improvement.",
      creative: "Provide a creative analysis of the following content. Explore themes, symbolism, artistic merit, and creative opportunities.",
      strategic: "Conduct a strategic analysis of the following content. Identify opportunities, risks, competitive advantages, and recommended actions.",
    }

    const result = await generateText(
      `${prompts[analysisType]}\n\n${context ? `Context: ${context}\n\n` : ""}Content:\n${content}`,
      { model: "gemini-3-flash-preview" }
    )

    yield {
      state: "complete" as const,
      analysis: result,
      analysisType,
    }
  },
})

/**
 * Task Delegation Tool - Spawn a sub-agent for a specific task
 */
export const delegateTool = tool({
  description: `Delegate a task to a specialized sub-agent. Use this for complex tasks that benefit from focused execution.
Available roles:
- researcher: Information gathering, web search, knowledge synthesis
- creator: Content generation - images, code, reports
- coder: Sandbox development, iterative coding, testing (use for coding projects)
- reviewer: Quality assurance, analysis, feedback`,
  inputSchema: z.object({
    taskDescription: z.string().describe("Clear description of the task to delegate"),
    agentRole: z.enum(["researcher", "creator", "executor", "reviewer", "coder"]).describe("The type of specialized agent to spawn"),
    priority: z.enum(["high", "normal", "low"]).default("normal"),
    context: z.record(z.unknown()).optional().describe("Additional context to pass to the sub-agent"),
  }),
  // Note: No execute function - this tool signals to the orchestrator to spawn a sub-agent
  // The orchestrator will handle the actual spawning
})

/**
 * Report Tool - Generate structured reports
 */
export const reportTool = tool({
  description: "Generate a structured report on a topic",
  inputSchema: z.object({
    topic: z.string().describe("The topic of the report"),
    format: z.enum(["brief", "detailed", "executive"]).default("detailed"),
    sections: z.array(z.string()).optional().describe("Optional specific sections to include"),
  }),
  execute: async function* ({ topic, format, sections }) {
    yield { state: "researching" as const, message: "Gathering information..." }

    pushActivity({
      action: "Report generation started",
      details: topic,
      source: "report-tool",
      level: "action",
    })

    const formatInstructions: Record<string, string> = {
      brief: "Create a concise 1-2 paragraph summary.",
      detailed: "Create a comprehensive report with sections, analysis, and recommendations.",
      executive: "Create an executive summary with key findings, metrics, and actionable insights.",
    }

    const sectionList = sections?.length
      ? `\n\nInclude these specific sections: ${sections.join(", ")}`
      : ""

    yield { state: "writing" as const, message: "Writing report..." }

    const result = await generateText(
      `Generate a ${format} report on: ${topic}\n\n${formatInstructions[format]}${sectionList}`,
      { model: "gemini-3-pro-preview" }
    )

    yield {
      state: "complete" as const,
      report: result,
      topic,
      format,
    }
  },
})

/**
 * All available tools for the orchestrator agent
 */
export const orchestratorTools = {
  research: researchTool,
  generateImage: imageGenerationTool,
  saveKnowledge: knowledgeTool,
  generateCode: codeGenerationTool,
  analyze: analysisTool,
  delegate: delegateTool,
  generateReport: reportTool,
  sandbox: sandboxTool,
} as const

/**
 * Tool sets for specialized sub-agents
 */
export const researcherTools = {
  research: researchTool,
  saveKnowledge: knowledgeTool,
  analyze: analysisTool,
} as const

export const creatorTools = {
  generateImage: imageGenerationTool,
  generateCode: codeGenerationTool,
  generateReport: reportTool,
  sandbox: sandboxTool,
} as const

export const reviewerTools = {
  analyze: analysisTool,
  saveKnowledge: knowledgeTool,
} as const

/**
 * Coder sub-agent tools - specialized for sandbox development
 */
export const coderTools = {
  sandbox: sandboxTool,
  generateCode: codeGenerationTool,
  analyze: analysisTool,
  saveKnowledge: knowledgeTool,
} as const

// Re-export sandbox tool for direct imports
export { sandboxTool } from "./sandbox"
