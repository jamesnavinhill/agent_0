import { generateText } from "@/lib/api/gemini"
import { addKnowledge } from "@/lib/db/knowledge"
import { saveGalleryItem } from "@/lib/db/gallery"
import { pushActivity } from "@/lib/activity/bus"
import { addMemory } from "@/lib/db/memories"
import { createDistilledMemoryNode } from "@/lib/memory/distillation"

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
    You are performing your "Morning Read" - a critical daily briefing for an advanced AI agent.
    Use Google Search to find high-signal, bleeding-edge tech news, AI breakthroughs, and scientific discoveries from the last 24 hours.
    
    Target Sources:
    - AI: Arxiv (new papers), HuggingFace (new models), Twitter/X (researcher discussions).
    - Tech: Hacker News (top stories), GitHub Trending (new repos), TechCrunch.
    - Science: Nature, ScienceDaily, EurekAlert.
    
    Avoid mainstream fluff. Focus on density, technical depth, and "new" information.

    Return the result as a JSON object with two fields:
    1. "reportMarkdown": A comprehensive Markdown report (string).
    2. "knowledgeItems": Array of objects, each with these REQUIRED fields:
       - "title": string (concise headline)
       - "summary": string (2-3 sentence explanation of why this matters)
       - "url": string (source URL)
       - "tags": string[] (relevant categories like "ai", "science", "research")

    # Format for "reportMarkdown":
    
    # Morning Briefing - [Date]
    
    <Introductory sentence setting the tone for the day>

    ## ⚡ Bleeding Edge (AI & Code)
    * **[Headline]**: Detailed summary of why this matters. Technical details preferred over marketing fluff.
    * ...

    ## 🌍 Global Signals (Tech & Science)
    * **[Headline]**: Summary of the discovery or event.
    * ...

    ## 🧠 Synthesis & Reflection
    * Your sophisticated analysis of these trends. How do they connect? What do they imply for the future of intelligence?

    ## 🔗 References
    * [Source Name](url)
    * [Source Name](url)
    
    (Note: Keep the main links in the bullet points, but ALSO provide a consolidated list at the bottom for clean reading).
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
    let skippedCount = 0
    const savedKnowledgeTitles: string[] = []
    if (Array.isArray(data.knowledgeItems)) {
      for (const rawItem of data.knowledgeItems) {
        // Handle case where AI returns strings instead of objects
        const item = typeof rawItem === 'string' 
          ? { title: rawItem, summary: rawItem, url: null, tags: ["research"] }
          : rawItem
        
        // Validate required fields before saving
        if (!item || typeof item !== 'object') {
          console.warn("[Research] Skipping invalid knowledge item:", rawItem)
          skippedCount++
          continue
        }
        
        if (!item.title || !item.summary) {
          console.warn("[Research] Skipping knowledge item with missing title or summary:", item)
          skippedCount++
          continue
        }
        
        const success = await addKnowledge({
          title: String(item.title).trim(),
          url: item.url ?? undefined,
          summary: String(item.summary).trim(),
          tags: Array.isArray(item.tags) ? item.tags : ["research"]
        })
        if (success) {
          savedCount++
          savedKnowledgeTitles.push(String(item.title).trim())
        }
      }
      
      if (skippedCount > 0) {
        console.warn(`[Research] Skipped ${skippedCount} knowledge items due to missing required fields`)
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

      // Add episodic memory of the event
      await addMemory({
        layer: "episodic",
        content: `Completed Morning Read. Generated "Daily Brief - ${dateStr}" with ${data.knowledgeItems?.length || 0} knowledge items.`,
        source: "morning-read",
        relevance: 0.8,
        tags: ["task", "research", "morning-read"]
      })

      await createDistilledMemoryNode({
        task: "morning-read",
        source: "morning-read",
        summary: `Daily Brief generated on ${dateStr} with ${savedCount} saved knowledge entries.`,
        highlights: savedKnowledgeTitles.slice(0, 3),
        tags: ["research", "knowledge", "daily-brief"],
        relevance: 0.9,
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
