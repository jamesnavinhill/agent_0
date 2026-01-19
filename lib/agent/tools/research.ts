import { generateText } from "@/lib/api/gemini"
import { addKnowledge } from "@/lib/db/knowledge"
import { saveGalleryItem } from "@/lib/db/gallery"
import { pushActivity } from "@/lib/activity/bus"

export async function performMorningRead() {
  const startTime = Date.now()

  pushActivity({
    action: "Starting Morning Read research",
    details: "Using Google Search grounding to find today's high-signal news",
    source: "Research",
    level: "action",
    timestamp: Date.now()
  })

  const prompt = `
    You are performing your "Morning Read". 
    Use Google Search to find high-signal tech news, AI breakthroughs, and scientific discoveries from the last 24 hours.
    
    Focus on:
    1. New AI Models or Papers (Arxiv, HuggingFace, TechCrunch)
    2. Major Tech Announcements (Google, OpenAI, Apple, etc.)
    3. Scientific Breakthroughs (Nature, ScienceDaily)
    4. Developer Tooling trends (GitHub trending, Hacker News)

    Return the result as a JSON object with two fields:
    1. "reportMarkdown": A synthesis of the information in Markdown format (Daily Brief style).
    2. "knowledgeItems": An array of interesting items found, where each item has:
       - "title": string
       - "url": string
       - "summary": string
       - "tags": string array (e.g. ["AI", "LLM", "News"])

    Markdown Format for "reportMarkdown":
    # Daily Brief - [Date]
    ## 🚀 AI & Tech
    * [Headline](link) - Summary
    
    ## 🔬 Science
    * [Headline](link) - Summary
    
    ## 💭 Agent Thoughts
    * Your personal reflection on what this news means for the future.
  `

  try {
    const response = await generateText(prompt, {
      model: "gemini-3-pro-preview",
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json"
    })

    const duration = Date.now() - startTime

    pushActivity({
      action: "Generated Morning Read report",
      details: `Response received in ${duration}ms, ${response.length} chars`,
      source: "Research",
      level: "info",
      timestamp: Date.now()
    })

    let data: { reportMarkdown?: string; knowledgeItems?: Array<{ title: string; url: string; summary: string; tags?: string[] }> }
    try {
      data = JSON.parse(response)
    } catch (parseError) {
      console.error("[Research] Failed to parse JSON response:", parseError)
      pushActivity({
        action: "Morning Read parse error",
        details: "Response was not valid JSON, using raw response",
        source: "Research",
        level: "error",
        timestamp: Date.now()
      })
      // Use raw response as report if JSON parse fails
      data = { reportMarkdown: response, knowledgeItems: [] }
    }

    // Save knowledge items with tracking
    let savedCount = 0
    if (Array.isArray(data.knowledgeItems)) {
      for (const item of data.knowledgeItems) {
        const success = await addKnowledge({
          title: item.title,
          url: item.url,
          summary: item.summary,
          tags: item.tags || ["research"]
        })
        if (success) savedCount++
      }

      pushActivity({
        action: `Saved ${savedCount}/${data.knowledgeItems.length} knowledge items`,
        details: data.knowledgeItems.map(i => i.title).join(", ").slice(0, 200),
        source: "Research",
        level: "info",
        timestamp: Date.now()
      })
    }

    // Save full report to gallery
    const reportMarkdown = data.reportMarkdown || response
    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })

    const galleryId = await saveGalleryItem({
      type: "text",
      content: reportMarkdown,
      title: `Daily Brief - ${dateStr}`,
      category: "research",
      metadata: {
        source: "morning-read",
        itemCount: data.knowledgeItems?.length || 0,
        durationMs: duration
      }
    })

    if (galleryId) {
      pushActivity({
        action: "Morning Read complete",
        details: `Report saved to gallery (${galleryId})`,
        source: "Research",
        level: "action",
        timestamp: Date.now()
      })
    }

    return reportMarkdown
  } catch (error) {
    console.error("Error performing morning read:", error)

    pushActivity({
      action: "Morning Read failed",
      details: error instanceof Error ? error.message : "Unknown error",
      source: "Research",
      level: "error",
      timestamp: Date.now()
    })

    return "Failed to perform Morning Read due to an error."
  }
}
