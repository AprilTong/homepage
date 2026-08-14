export type AiToolType = 'skill' | 'mcp'
export type AiToolFilter = AiToolType | null

export interface AiToolSummary {
  path: string
  title: string
  description: string
  type: AiToolType
  order: number
  platforms: string[]
  tags: string[]
  officialUrl: string
  repositoryUrl?: string
  featured: boolean
}
