// Text-to-Speech Types
export interface TTSRequest {
  text: string;
  provider?: string;
  model?: string;
  voice?: string;
  language?: string;
  temperature?: number;
  top_p?: number;
  repetition_penalty?: number;
  max_tokens?: number;
}

export interface TTSResponse {
  success: boolean;
  message?: string;
  audio_url?: string;
  audio_base64?: string;
  audio?: string;
  audio_type?: string;
  sample_rate?: number;
}

// Automatic Speech Recognition (Transcription) Types
export interface ASRRequest {
  audio: string; // base64 encoded audio
  audio_type?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
}

export interface ASRResponse {
  success: boolean;
  message?: string;
  text?: string;
}

// Translation Types
export interface TranslationRequest {
  text: string;
  provider?: string;
  model?: string;
  source_lang?: string;
  target_lang: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
}

export interface TranslationResponse {
  success: boolean;
  message?: string;
  translated_text?: string;
}

// Chat Message Types
export interface ChatMessage {
  id: string;
  chatId: string;
  content: string;
  senderId: string;
  timestamp: Date;
  type: "text" | "audio";
  translatedText?: string;
  transcribedText?: string;
}

// User Types
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Socket Events
export interface SocketEvents {
  'user:join': (userData: UserInfo) => void;
  'user:online': (data: { userId: string; isOnline: boolean; userInfo?: UserInfo }) => void;
  'user:offline': (data: { userId: string; isOnline: boolean; userInfo?: UserInfo }) => void;
  'users:list': (users: UserInfo[]) => void;
  'chat:join': (chatId: string) => void;
  'chat:leave': (chatId: string) => void;
  'message:send': (message: ChatMessage) => void;
  'message:receive': (message: ChatMessage) => void;
  'user:typing': (data: { chatId: string; userId: string; isTyping: boolean }) => void;
  'message:read': (data: { chatId: string; messageId: string; userId: string }) => void;
}
