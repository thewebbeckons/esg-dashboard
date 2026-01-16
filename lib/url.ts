/**
 * URL Canonicalization utilities
 * Strips tracking params, normalizes scheme/host, removes fragments
 */

const TRACKING_PARAMS = new Set([
  // Google Analytics / Ads
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'gclsrc',
  'dclid',
  // Facebook
  'fbclid',
  'fb_action_ids',
  'fb_action_types',
  'fb_source',
  'fb_ref',
  // Twitter
  'twclid',
  // Microsoft
  'msclkid',
  // Mailchimp
  'mc_cid',
  'mc_eid',
  // HubSpot
  'hsa_acc',
  'hsa_cam',
  'hsa_grp',
  'hsa_ad',
  'hsa_src',
  'hsa_net',
  'hsa_ver',
  // Other common tracking
  'ref',
  'ref_src',
  'source',
  '_ga',
  '_gl',
  'yclid',
  'wickedid',
  'igshid',
  'si',
  's_kwcid',
  'trk',
  'trkEmail',
  'sc_campaign',
  'sc_channel',
  'sc_content',
  'sc_medium',
  'sc_outcome',
  'sc_geo',
  'sc_country'
])

/**
 * Canonicalize a URL by:
 * 1. Parsing and normalizing scheme/host (lowercase)
 * 2. Removing tracking parameters
 * 3. Removing fragments
 * 4. Removing trailing slashes (except for root paths)
 * 5. Sorting remaining query parameters
 */
export function canonicalizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString)

    // Normalize scheme to https if http
    if (url.protocol === 'http:') {
      url.protocol = 'https:'
    }

    // Lowercase host
    url.hostname = url.hostname.toLowerCase()

    // Remove fragment
    url.hash = ''

    // Filter out tracking params and sort remaining
    const params = new URLSearchParams()
    const sortedKeys = Array.from(url.searchParams.keys()).sort()

    for (const key of sortedKeys) {
      const lowerKey = key.toLowerCase()
      if (!TRACKING_PARAMS.has(lowerKey) && !lowerKey.startsWith('utm_')) {
        const value = url.searchParams.get(key)
        if (value !== null) {
          params.set(key, value)
        }
      }
    }

    url.search = params.toString()

    // Remove trailing slash unless it's the root path
    let result = url.toString()
    if (result.endsWith('/') && url.pathname !== '/') {
      result = result.slice(0, -1)
    }

    return result
  } catch {
    // If URL parsing fails, return as-is
    return urlString
  }
}

/**
 * Extract the domain from a URL
 */
export function extractDomain(urlString: string): string {
  try {
    const url = new URL(urlString)
    return url.hostname.toLowerCase()
  } catch {
    return ''
  }
}

/**
 * Check if a URL is valid
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Resolve a potentially relative URL against a base URL
 */
export function resolveUrl(urlString: string, baseUrl: string): string {
  try {
    return new URL(urlString, baseUrl).toString()
  } catch {
    return urlString
  }
}
