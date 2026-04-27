/**
 * Lists Gemini models the current GOOGLE_API_KEY can call generateContent on.
 * Use this to find the right model ID when the API returns 404.
 *
 *   npx tsx scripts/vision-eval/list-gemini-models.ts
 */
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env.local' })

type GeminiModel = {
  name?: string
  displayName?: string
  supportedActions?: string[]
}

async function main() {
  const moduleName = '@google/genai'
  const mod = (await import(moduleName)) as {
    GoogleGenAI: new (args: { apiKey: string }) => {
      models: { list(): AsyncIterable<GeminiModel> }
    }
  }

  const c = new mod.GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY ?? '' })
  const list = await c.models.list()
  for await (const m of list) {
    if (m.name && (m.supportedActions ?? []).includes('generateContent')) {
      console.log(m.name.padEnd(45), m.displayName ?? '')
    }
  }
}

main().catch((err) => {
  console.error('list failed:', err)
  process.exit(1)
})
