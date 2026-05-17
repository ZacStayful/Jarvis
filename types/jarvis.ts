// ─── JARVIS Core Types ────────────────────────────────────────────────────────

export type JARVISState = 'idle' | 'listening' | 'thinking' | 'speaking';

// ─── Message Types ────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface BaseMessage {
  id: string;
  role: MessageRole;
  timestamp: Date;
  isStreaming?: boolean;
  model?: string;
}

export interface TextMessage extends BaseMessage {
  type: 'text';
  content: string;
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

export interface UseJARVISReturn {
  messages: Message[];
  jarvisState: JARVISState;
  isLoading: boolean;
  sendMessage: (content: string, deep?: boolean) => Promise<void>;
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
}

// ─── Integration Status ───────────────────────────────────────────────────────

export interface IntegrationStatus {
  name: string;
  connected: boolean;
  tokenPresent: boolean;
}
