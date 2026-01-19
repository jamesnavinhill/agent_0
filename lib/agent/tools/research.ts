import { generateText } from "@/lib/api/gemini"
import { addKnowledge } from "@/lib/db/knowledge"

export async function performMorningRead() {
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

    const data = JSON.parse(response)
    
    // Save knowledge items
    if (Array.isArray(data.knowledgeItems)) {
      for (const item of data.knowledgeItems) {
        await addKnowledge({
          title: item.title,
          url: item.url,
          summary: item.summary,
          tags: item.tags || ["research"]
        })
      }
    }

    return data.reportMarkdown || response
  } catch (error) {
    console.error("Error performing morning read:", error)
    return "Failed to perform Morning Read due to an error."
  }
}
