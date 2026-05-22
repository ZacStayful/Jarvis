// lib/whatsapp-conversation.ts
// Conversation state for a WhatsApp thread with a single lead.
// Persisted as a JSON string in Monday column long_text_mm3jj9fg.

export interface ConversationMessage {
  role: 'outbound' | 'inbound'
  content: string
  timestamp: string
  intent?: string
}

export interface ConversationState {
  leadId: string
  messages: ConversationMessage[]
  currentStep: number
  bookingDetected: boolean
  abandonmentSignals: number
  lastUpdated: string
}

export function emptyState(leadId = ''): ConversationState {
  return {
    leadId,
    messages: [],
    currentStep: 0,
    bookingDetected: false,
    abandonmentSignals: 0,
    lastUpdated: new Date().toISOString(),
  }
}

export function parseConversation(raw: string): ConversationState {
  if (!raw || typeof raw !== 'string') return emptyState()
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return emptyState()
    return {
      leadId: typeof parsed.leadId === 'string' ? parsed.leadId : '',
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      currentStep: typeof parsed.currentStep === 'number' ? parsed.currentStep : 0,
      bookingDetected: !!parsed.bookingDetected,
      abandonmentSignals:
        typeof parsed.abandonmentSignals === 'number' ? parsed.abandonmentSignals : 0,
      lastUpdated:
        typeof parsed.lastUpdated === 'string' ? parsed.lastUpdated : new Date().toISOString(),
    }
  } catch {
    return emptyState()
  }
}

export function appendMessage(
  state: ConversationState,
  role: 'outbound' | 'inbound',
  content: string,
  intent?: string,
): ConversationState {
  const message: ConversationMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
  }
  if (intent) message.intent = intent
  return {
    ...state,
    messages: [...state.messages, message],
    lastUpdated: new Date().toISOString(),
  }
}

export function serializeConversation(state: ConversationState): string {
  return JSON.stringify(state)
}

// Returns the content of the most recent inbound message in the
// conversation, or null if the lead has never replied. Used by
// re-engagement templates to pick up the thread naturally.
export function getLastInboundMessage(state: ConversationState): string | null {
  if (!state?.messages?.length) return null
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const m = state.messages[i]
    if (m?.role === 'inbound' && typeof m.content === 'string') {
      return m.content
    }
  }
  return null
}
