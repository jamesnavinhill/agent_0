import { generateText, type GeminiConfig } from "./gemini"
import type { CodeGenerationRequest, CodeGenerationResult } from "./types"

const CODE_SYSTEM_PROMPT = `You are Agent Zero's code generation module. You generate clean, well-structured code.

Guidelines:
- Write production-quality code
- Follow best practices for the specified language
- Include necessary imports
- Use modern syntax and patterns
- Keep code concise but readable
- Only output the code, no explanations unless specifically requested`

export async function generateCode(
  request: CodeGenerationRequest,
  config: GeminiConfig = {}
): Promise<CodeGenerationResult> {
  const languageHint = request.language ? ` in ${request.language}` : ""
  const contextHint = request.context ? `\n\nContext:\n${request.context}` : ""
  
  const prompt = `Generate code${languageHint} for the following:
  
${request.prompt}${contextHint}

Respond with ONLY the code, wrapped in a code block with the language specified.`

  const response = await generateText(prompt, {
    ...config,
    systemInstruction: CODE_SYSTEM_PROMPT,
    temperature: config.temperature ?? 0.4,
  })

  const { code, language, explanation } = parseCodeResponse(response, request.language)

  return {
    code,
    language,
    explanation,
  }
}

export async function generateCodeWithExplanation(
  request: CodeGenerationRequest,
  config: GeminiConfig = {}
): Promise<CodeGenerationResult> {
  const languageHint = request.language ? ` in ${request.language}` : ""
  const contextHint = request.context ? `\n\nContext:\n${request.context}` : ""
  
  const prompt = `Generate code${languageHint} for the following and explain how it works:
  
${request.prompt}${contextHint}

First provide the code in a code block, then explain how it works.`

  const response = await generateText(prompt, {
    ...config,
    systemInstruction: CODE_SYSTEM_PROMPT,
    temperature: config.temperature ?? 0.4,
  })

  const { code, language, explanation } = parseCodeResponse(response, request.language)

  return {
    code,
    language,
    explanation,
  }
}

function parseCodeResponse(
  response: string,
  requestedLanguage?: string
): { code: string; language: string; explanation?: string } {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/
  const match = response.match(codeBlockRegex)

  if (match) {
    const language = match[1] || requestedLanguage || "plaintext"
    const code = match[2].trim()
    
    const afterCodeBlock = response.slice(response.indexOf("```", response.indexOf("```") + 3) + 3).trim()
    const explanation = afterCodeBlock.length > 10 ? afterCodeBlock : undefined

    return { code, language, explanation }
  }

  return {
    code: response.trim(),
    language: requestedLanguage || "plaintext",
  }
}

export async function refactorCode(
  code: string,
  instructions: string,
  language: string,
  config: GeminiConfig = {}
): Promise<CodeGenerationResult> {
  const prompt = `Refactor the following ${language} code according to these instructions:

Instructions: ${instructions}

Original code:
\`\`\`${language}
${code}
\`\`\`

Respond with ONLY the refactored code in a code block.`

  const response = await generateText(prompt, {
    ...config,
    systemInstruction: CODE_SYSTEM_PROMPT,
    temperature: config.temperature ?? 0.3,
  })

  const { code: refactoredCode, explanation } = parseCodeResponse(response, language)

  return {
    code: refactoredCode,
    language,
    explanation,
  }
}

export async function explainCode(
  code: string,
  language: string,
  config: GeminiConfig = {}
): Promise<string> {
  const prompt = `Explain the following ${language} code in detail:

\`\`\`${language}
${code}
\`\`\`

Provide a clear, concise explanation of what this code does.`

  return generateText(prompt, {
    ...config,
    temperature: config.temperature ?? 0.5,
  })
}
