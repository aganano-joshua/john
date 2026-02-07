/**
 * types/index.ts
 * ==============
 * Centralised TypeScript type definitions for the LinguaFlow app.
 *
 * This file defines every request / response shape used when
 * communicating with the Hypa AI backend APIs (TTS, ASR, Translation),
 * as well as shared domain types like User, Message, Chat, etc.
 */

// ─── Domain Types ─────────────────────────────────────────────

/** A user in the system (online presence list, chat participants, etc.) */
export interface User {
  /** Unique user identifier */
  id: string
  /** Display name */
  name: string
  /** Avatar image URL */
  avatar: string
  /** Current presence status */
  status: 'online' | 'offline' | 'away' | 'busy'
  /** Last time the user was active (optional) */
  lastSeen?: Date
}

/** A chat message (text, audio, or image) */
export interface Message as ChatMessage {
  /** Unique message identifier */
  id: string
  /** Text body of the message */
  content: string
  /** ID of the user who sent this message */
  senderId: string
  /** ID of the chat / room this message belongs to */
  chatId: string
  /** Message media type */
  type: 'text' | 'audio' | 'image'
  /** URL of the audio file (for audio messages) */
  audioUrl?: string
  /** Duration of the audio clip in seconds */
  audioDuration?: number
  /** URL of the attached image (for image messages) */
  imageUrl?: string
  /** When the message was created */
  timestamp: Date
  /** Whether the recipient has read this message */
  isRead: boolean
  /** Inline translation (populated by the Translate action) */
  translatedContent?: string
  /** Inline transcription (populated by the Transcribe action) */
  transcribedContent?: string
}

/** A conversation (direct or group) */
export interface Chat {
  id: string
  /** 'direct' = 1-on-1, 'group' = multi-participant */
  type: 'direct' | 'group'
  /** Display name of the chat */
  name: string
  avatar?: string
  /** Users participating in this chat */
  participants: User[]
  /** Most recent message (for sidebar preview) */
  lastMessage?: Message
  /** How many unread messages the current user has */
  unreadCount: number
  createdAt: Date
  updatedAt: Date
}

// ─── TTS (Text-to-Speech) Types ──────────────────────────────

/** Available TTS model identifiers from Hypa AI */
export type TTSModel =
  | 'hypaai-orpheus-v5-pqq'
  | 'Hypa-Orpheus-V4-new'
  | 'hypaai-orpheus-v4-dus'
  | 'Hypa-Orpheus-V2'
  | 'hypa-orpheus-3b-0-1-ft-unslo-ldl'

/** Available TTS voice names */
export type TTSVoice =
  | 'Eniola'
  | 'Juliet'
  | 'Faith'
  | 'Zac'
  | 'tara'
  | 'Moyo'
  | 'Gbemisola'
  | 'Pauline'
  | 'Toyin'
  | 'Henrietta'
  | 'Lovelyn'
  | 'Prince'
  | 'Emmanuel'
  | 'Eunice'
  | 'Tapshak'
  | 'Deborah'
  | 'Enioma'
  | 'Aitee'
  | 'Beatrice'
  | 'Shetima'
  | 'Edache'
  | 'Victor'
  | 'David'

/** Languages supported by the TTS engine (lowercase) */
export type TTSLanguage =
  | 'english'
  | 'yoruba'
  | 'igbo'
  | 'hausa'
  | 'annang'
  | 'efik'
  | 'ibibio'
  | 'idoma'
  | 'tiv'

/** Payload sent to the /api/tts endpoint */
export interface TTSRequest {
  /** The text to convert to speech */
  text: string
  provider: 'hypaai'
  model: TTSModel
  voice: TTSVoice
  language: TTSLanguage
  temperature?: number
  top_p?: number
  repetition_penalty?: number
  max_tokens?: number
}

/** Response from the TTS endpoint */
export interface TTSResponse {
  /** URL to the generated audio file (if server-hosted) */
  audio_url?: string
  /** Base64-encoded audio data */
  audio_base64?: string
  /** Whether the request succeeded */
  success: boolean
  /** Error message (if any) */
  message?: string
}

// ─── ASR (Automatic Speech Recognition / Transcription) ─────

/** Available ASR model identifiers from Hypa AI */
export type ASRModel =
  | 'wspr-small-2025-11-11-12-12--mpk'
  | 'hypaai-whisper-base-v1-04292-lhy'

/** Payload sent to the /api/asr endpoint */
export interface ASRRequest {
  /** Base64-encoded audio data */
  audio: string
  audio_type: 'base64'
  provider: 'hypaai'
  model: ASRModel
  temperature?: number
  top_p?: number
  top_k?: number
}

/** Response from the ASR endpoint */
export interface ASRResponse {
  /** Transcribed text */
  text?: string
  success: boolean
  message?: string
}

// ─── Translation Types ───────────────────────────────────────

/** Available translation model identifiers from Hypa AI */
export type TranslationModel =
  | 'hypa-llama3-2-8b-sft-2025-12-rvl'
  | 'hypa-llama3-1-8b-sft-2025-10-swn'
  | 'llama-3-2-8b-instruct-bnb-4b-ync'

/** Supported translation languages (includes "Auto Detect" for source) */
export type TranslationLanguage =
  | 'Auto Detect'
  | 'English'
  | 'Yoruba'
  | 'Igbo'
  | 'Hausa'
  | 'Tiv'
  | 'Annang'
  | 'Efik'
  | 'Ibibio'
  | 'Idoma'
  | 'Ebira'
  | 'Igala'

/** Payload sent to the /api/mt (machine translation) endpoint */
export interface TranslationRequest {
  /** The text to translate */
  text: string
  provider: 'hypaai'
  model: TranslationModel
  stream: boolean
  source_lang: TranslationLanguage
  target_lang: TranslationLanguage
  temperature?: number
  top_p?: number
  top_k?: number
}

/** Response from the translation endpoint */
export interface TranslationResponse {
  /** The translated text (undefined on failure) */
  translated_text?: string
  success: boolean
  message?: string
}

// ─── User Settings ───────────────────────────────────────────

/** Persisted user preferences for TTS, ASR, and translation defaults */
export interface UserSettings {
  tts: {
    model: TTSModel
    voice: TTSVoice
    defaultLanguage: TTSLanguage
  }
  asr: {
    model: ASRModel
  }
  translation: {
    model: TranslationModel
    defaultSourceLang: TranslationLanguage
    defaultTargetLang: TranslationLanguage
  }
  theme: 'light' | 'dark' | 'system'
}

// ─── Socket Event Signatures ─────────────────────────────────

/** Typed map of Socket.IO events emitted / received by the client */
export interface SocketEvents {
  'message:send': (message: Omit<Message, 'id' | 'timestamp'>) => void
  'message:receive': (message: Message) => void
  'message:read': (data: { chatId: string; messageId: string }) => void
  'user:typing': (data: {
    chatId: string
    userId: string
    isTyping: boolean
  }) => void
  'user:status': (data: { userId: string; status: User['status'] }) => void
}
