// Types for the messaging app

export interface User {
  id: string
  name: string
  avatar: string
  status: 'online' | 'offline' | 'away' | 'busy'
  lastSeen?: Date
}

export interface Message as ChatMessage {
  id: string
  content: string
  senderId: string
  chatId: string
  type: 'text' | 'audio' | 'image'
  audioUrl?: string
  audioDuration?: number
  imageUrl?: string
  timestamp: Date
  isRead: boolean
  translatedContent?: string
  transcribedContent?: string
}

export interface Chat {
  id: string
  type: 'direct' | 'group'
  name: string
  avatar?: string
  participants: User[]
  lastMessage?: Message
  unreadCount: number
  createdAt: Date
  updatedAt: Date
}

// TTS Types
export type TTSModel =
  | 'hypaai-orpheus-v5-pqq'
  | 'Hypa-Orpheus-V4-new'
  | 'hypaai-orpheus-v4-dus'
  | 'Hypa-Orpheus-V2'
  | 'hypa-orpheus-3b-0-1-ft-unslo-ldl'

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

export interface TTSRequest {
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

export interface TTSResponse {
  audio_url?: string
  audio_base64?: string
  success: boolean
  message?: string
}

// ASR (Transcription) Types
export type ASRModel =
  | 'wspr-small-2025-11-11-12-12--mpk'
  | 'hypaai-whisper-base-v1-04292-lhy'

export interface ASRRequest {
  audio: string // base64 encoded
  audio_type: 'base64'
  provider: 'hypaai'
  model: ASRModel
  temperature?: number
  top_p?: number
  top_k?: number
}

export interface ASRResponse {
  text?: string
  success: boolean
  message?: string
}

// Translation Types
export type TranslationModel =
  | 'hypa-llama3-2-8b-sft-2025-12-rvl'
  | 'hypa-llama3-1-8b-sft-2025-10-swn'
  | 'llama-3-2-8b-instruct-bnb-4b-ync'

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

export interface TranslationRequest {
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

export interface TranslationResponse {
  translated_text?: string
  success: boolean
  message?: string
}

// Settings Types
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

// Socket Events
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
