/**
 * api.ts
 * ======
 * Frontend API client for the LinguaFlow backend.
 *
 * Provides typed helper functions for calling the three Hypa AI
 * endpoints exposed by the Express backend:
 *
 *   1. **textToSpeech()**  — POST /api/tts  — Text-to-Speech
 *   2. **transcribeAudio()** — POST /api/asr — Automatic Speech Recognition
 *   3. **translateText()** — POST /api/mt  — Machine Translation
 *
 * Also includes two utility helpers:
 *   - **fileToBase64()** — read a File / Blob into a base64 string
 *   - **audioUrlToBase64()** — fetch an audio URL and return base64
 */

// import {
//   TTSRequest,
//   TTSResponse,
//   ASRRequest,
//   ASRResponse,
//   TranslationRequest,
//   TranslationResponse,
// } from '@/types';

import type { ASRRequest, ASRResponse, TranslationRequest, TranslationResponse, TTSRequest, TTSResponse } from "@/types";

/**
 * Base URL of our Express backend.
 * Falls back to localhost:3001 during local development.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Text-to-Speech API
 *
 * Sends text to the backend /api/tts endpoint which proxies
 * Hypa AI’s TTS API. Returns either a hosted `audio_url` or
 * raw `audio_base64` data.
 *
 * @param request — TTS parameters (text, model, voice, language)
 * @returns TTSResponse with audio data on success
 */
// Text-to-Speech API
export async function textToSpeech(request: TTSRequest): Promise<TTSResponse> {
  try {
    const payload = {
      text: request.text,
      provider: request.provider ?? 'hypaai',
      model: request.model ?? 'hypaai-orpheus-v4-dus',
      voice: request.voice ?? 'Eniola',
      language: request.language ?? 'english',
      temperature: request.temperature ?? 0.3,
      top_p: request.top_p ?? 0.95,
      repetition_penalty: request.repetition_penalty ?? 4.5,
      max_tokens: request.max_tokens ?? 1000,
    };

    const response = await fetch(`${API_BASE_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'TTS request failed' };
    }

    return {
      success: true,
      audio_url: data.audio_url,
      audio_base64: data.audio_base64 || data.audio,
    //   audio: data.audio,
    //   audio_type: data.audio_type,
    //   sample_rate: data.sample_rate,
    };
  } catch (error) {
    console.error('TTS Error:', error);
    return { success: false, message: 'Failed to convert text to speech' };
  }
}

/**
 * Automatic Speech Recognition (Transcription) API
 *
 * Accepts base64-encoded audio and sends it to the backend
 * /api/asr endpoint which proxies Hypa AI’s ASR service.
 * Returns the transcribed text on success.
 *
 * @param request — ASR parameters (audio base64, model)
 * @returns ASRResponse with recognised text
 */
// Automatic Speech Recognition (Transcription) API
export async function transcribeAudio(
  request: ASRRequest,
): Promise<ASRResponse> {
  try {
    const payload = {
      audio: request.audio,
      audio_type: 'base64',
      provider: request.provider ?? 'hypaai',
      model: request.model ?? 'wspr-small-2025-11-11-12-12--mpk',
      temperature: request.temperature ?? 0.3,
      top_p: request.top_p ?? 0.95,
      top_k: request.top_k ?? 30,
    };

    const response = await fetch(`${API_BASE_URL}/api/asr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'Transcription failed' };
    }

    return { success: true, text: data.text };
  } catch (error) {
    console.error('ASR Error:', error);
    return { success: false, message: 'Failed to transcribe audio' };
  }
}

/**
 * Translation API
 *
 * Sends text to the backend /api/mt endpoint for machine
 * translation between any of the supported Hypa AI languages.
 *
 * @param request — translation parameters (text, source_lang, target_lang, model)
 * @returns TranslationResponse with translated_text
 */
// Translation API
export async function translateText(
  request: TranslationRequest,
): Promise<TranslationResponse> {
  try {
    const payload = {
      text: request.text,
      provider: request.provider ?? 'hypaai',
      model: request.model ?? 'hypa-llama3-2-8b-sft-2025-12-rvl',
      stream: false,
      source_lang: request.source_lang,
      target_lang: request.target_lang,
      temperature: request.temperature ?? 0.8,
      top_p: request.top_p ?? 0.95,
      top_k: request.top_k ?? 50,
    };

    const response = await fetch(`${API_BASE_URL}/api/mt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, message: data.message || 'Translation failed' };
    }

    return { success: true, translated_text: data.translated_text };
  } catch (error) {
    console.error('Translation Error:', error);
    return { success: false, message: 'Failed to translate text' };
  }
}

/**
 * fileToBase64
 *
 * Read a File (or Blob wrapped as File) and return its
 * content as a pure base64 string (no data-URL prefix).
 * Used before sending audio to the ASR endpoint.
 *
 * @param file — a File or Blob-as-File to encode
 * @returns pure base64 string
 */
// Helper to convert file to base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

/**
 * audioUrlToBase64
 *
 * Fetch an audio file from a URL (e.g. an HTTP link returned by
 * the TTS API), read it as a Blob, and convert to a base64 string.
 * This is necessary because the ASR endpoint expects base64 input.
 *
 * @param url — HTTP(S) URL pointing to an audio file
 * @returns pure base64 string
 */
// Helper to convert audio URL to base64
export async function audioUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}
