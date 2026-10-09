// ─── JARVIS Core Types ────────────────────────────────────────────────────────

export type JARVISState = 'idle' | 'listening' | 'thinking' | 'speaking';

// ─── Staff ────────────────────────────────────────────────────────────────────
// Two members of staff share one conversation: JARVIS (managing director) and
// Janet (marketing creative director). Every assistant message records who
// spoke so the UI can label it and speak it in the right voice.

export type PersonaId = 'jarvis' | 'janet';
export type InputMode = 'voice' | 'text';

// ─── Message Types ────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface BaseMessage {
  id: string;
  role: MessageRole;
  timestamp: Date;
  isStreaming?: boolean;
  model?: string;
  // Which member of staff said it (assistant messages only).
  speaker?: PersonaId;
  // Shown in the feed but never sent to the API, KV or the EOD transcript:
  // greetings, handover lines, error notices.
  local?: boolean;
}

export interface TextMessage extends BaseMessage {
  type: 'text';
  content: string;
  // Technical detail behind a friendly error line (rendered small, never spoken).
  errorDetail?: string;
}

export interface ApprovalMessage extends BaseMessage {
  type: 'approval';
  content: string;           // The surrounding text JARVIS spoke
  actionRequest: ActionRequest;
  status: 'pending' | 'approved' | 'denied';
}

export type Message = TextMessage | ApprovalMessage;

// ─── Action Request Types ─────────────────────────────────────────────────────

export type ActionType =
  | 'book_meeting'
  | 'update_monday'
  | 'create_monday_item'
  | 'send_email'
  | 'send_slack'
  | 'trigger_workflow'
  | 'trigger_lucy'
  | 'write_obsidian'
  | 'write_drive';

export interface ActionRequest {
  id: string;
  type: ActionType;
  description: string;         // One-sentence human summary
  details: ActionDetails;
}

// ─── Action Detail Shapes ─────────────────────────────────────────────────────

export type ActionDetails =
  | BookMeetingDetails
  | UpdateMondayDetails
  | CreateMondayItemDetails
  | SendEmailDetails
  | SendSlackDetails
  | TriggerWorkflowDetails
  | TriggerLucyDetails
  | WriteObsidianDetails
  | WriteDriveDetails;

export interface BookMeetingDetails {
  leadName: string;
  email: string;
  date: string;
  time: string;
  meetingType: string;
}

export interface UpdateMondayDetails {
  boardId: string;
  boardName: string;
  itemId: string;
  itemName: string;
  field: string;
  currentValue: string | null;
  newValue: string;
}

export interface CreateMondayItemDetails {
  boardId: string;
  boardName: string;
  itemName: string;
  fields: Record<string, string>;
}

export interface SendEmailDetails {
  to: string;
  subject: string;
  body: string;
}

export interface SendSlackDetails {
  channel: string;
  message: string;
}

export interface TriggerWorkflowDetails {
  workflowName: string;
  workflowId: string;
  description: string;
  inputs?: Record<string, string>;
}

export interface TriggerLucyDetails {
  leads: Array<{ name: string; phone: string; profile: string }>;
  context: string;
  expectedOutcome: string;
}

export interface WriteObsidianDetails {
  noteTitle: string;
  folder: string;
  contentSummary: string;
  content: string;
}

export interface WriteDriveDetails {
  fileName: string;
  folder: string;
  contentSummary: string;
}

// ─── Hook Return Types ────────────────────────────────────────────────────────

export interface UseJARVISOptions {
  onStateChange?: (state: JARVISState) => void;
  onError?: (error: string) => void;
}

// Per-message context the client knows and the server doesn't.
export interface SendOptions {
  inputMode?: InputMode;
  persona?: PersonaId;
  activeView?: string;
  viewJustOpened?: boolean;
  viewContext?: string;
}

export interface UseJARVISReturn {
  messages: Message[];
  jarvisState: JARVISState;
  isLoading: boolean;
  sendMessage: (content: string, deep?: boolean, opts?: SendOptions) => Promise<void>;
  approveAction: (messageId: string) => Promise<void>;
  denyAction: (messageId: string) => void;
  clearMessages: () => void;
  currentResponse: string;
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ApiMessage {
  role: MessageRole;
  content: string;
}

export interface ChatRequestBody {
  messages: ApiMessage[];
  deep?: boolean;
  maxTokens?: number;
  crossSessionContext?: string;
  persona?: PersonaId;
  inputMode?: InputMode;
  activeView?: string;
  viewJustOpened?: boolean;
  viewContext?: string;
}

// ─── Integration Status ───────────────────────────────────────────────────────

export interface IntegrationStatus {
  name: string;
  connected: boolean;
  tokenPresent: boolean;
}
