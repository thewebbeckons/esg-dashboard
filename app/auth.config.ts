import { createAuthClient } from 'better-auth/vue'

export const authClient = createAuthClient({})

// Re-export for the module to detect
export function createAppAuthClient() {
  return authClient
}

export default createAppAuthClient
