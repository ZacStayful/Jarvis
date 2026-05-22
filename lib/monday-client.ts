// lib/monday-client.ts
// Thin Monday.com GraphQL client. All WhatsApp routes use this helper.

const MONDAY_URL = 'https://api.monday.com/v2'

export async function mondayQuery(query: string): Promise<any> {
  const token = process.env.MONDAY_API_TOKEN || process.env.MONDAY_API_KEY
  if (!token) {
    throw new Error('MONDAY_API_TOKEN is not set')
  }

  const res = await fetch(MONDAY_URL, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Monday API ${res.status}: ${text}`)
  }

  const json = await res.json()
  if (json.errors && Array.isArray(json.errors) && json.errors.length > 0) {
    throw new Error(`Monday GraphQL error: ${JSON.stringify(json.errors)}`)
  }
  return json.data
}

// Escape a string for inline insertion into a GraphQL string literal.
export function escapeGraphQLString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

// Escape a JSON string for inline insertion as the *value* of column_values JSON.
// Used when you have a JSON object and want to pass it as the value of change_multiple_column_values.
export function escapeJSONForGraphQL(jsonStr: string): string {
  return jsonStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
