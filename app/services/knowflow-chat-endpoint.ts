export const KNOWFLOW_LOCAL_PROXY_ENDPOINT = '/api/public-chat'

export function resolveKnowflowChatEndpoint(upstreamEndpoint: string, isDevelopment: boolean) {
  return isDevelopment ? KNOWFLOW_LOCAL_PROXY_ENDPOINT : upstreamEndpoint
}
