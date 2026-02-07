/**
 * server.js
 * =========
 * Express + Socket.IO backend for the LinguaFlow chat application.
 *
 * This server has two main roles:
 *
 * 1. **API Proxy** — Relays TTS, ASR, and Translation requests to
 *    the Hypa AI API (api.hypaintelligence.com) so the browser
 *    never needs to expose the API key.
 *
 * 2. **Real-time Messaging** — Uses Socket.IO to handle:
 *    - User presence (join / disconnect / online list)
 *    - Chat rooms (join / leave)
 *    - Message broadcasting
 *    - Typing indicators
 *
 * Environment variables (optional, see .env):
 *   HYPA_API_URL  — base URL for Hypa AI (default: https://api.hypaintelligence.com/v2/developer)
 *   HYPA_API_KEY  — API key for authentication
 *   PORT          — listen port (default: 3001)
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

/** Create the Express app and wrap it in an HTTP server (needed by Socket.IO) */
const app = express();
const httpServer = createServer(app);

// ─── Middleware ───
// CORS allows the Vite dev server (different port) to call our API.
// The 50 MB limit is required because audio base64 payloads can be large.
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/** Hypa AI API base URL */
const API_URL =
  process.env.HYPA_API_URL || 'https://api.hypaintelligence.com/v2/developer';
/** Hypa AI API key (sent as x-api-key header) */
const API_KEY = process.env.HYPA_API_KEY || '';

// ────────────────────────────────────────────────────────────
// In-Memory User Store
// Tracks which users are online and maps socket IDs back to user IDs.
// ────────────────────────────────────────────────────────────

/** Map<userId, { socketId, userInfo }> — all currently connected users */
const connectedUsers = new Map();
/** Map<socketId, userId> — reverse lookup to find a userId from a socket */
const userSockets = new Map();

/**
 * Build a list of all online users, optionally excluding one user.
 * Used to send the “users:list” event when a user first connects.
 *
 * @param {string|null} excludeUserId — userId to omit (e.g. the requester)
 * @returns {Array<{id, name, avatar, email}>}
 */
function getOnlineUsersList(excludeUserId = null) {
  const users = [];
  for (const [userId, data] of connectedUsers.entries()) {
    if (userId !== excludeUserId && data.userInfo) {
      users.push({
        id: userId,
        name: data.userInfo.name,
        avatar: data.userInfo.avatar,
        email: data.userInfo.email,
      });
    }
  }
  return users;
}

// ==================== API ROUTES ====================
// These endpoints act as a proxy between the browser and the
// Hypa AI API so that the API key is never exposed to the client.

/**
 * POST /api/tts — Text-to-Speech
 *
 * Receives { text, provider, model, voice, language, ... } from the
 * frontend, forwards it to the Hypa AI TTS endpoint, and normalises
 * the response into { success, audio_base64, audio_url }.
 */
// Text-to-Speech API
app.post('/api/tts', async (req, res) => {
  try {
    const body = req.body;

    console.log('TTS Request URL:', `${API_URL}/tts`);
    console.log('TTS Request Body:', JSON.stringify(body).substring(0, 200));
    console.log('API Key present:', !!API_KEY, 'Length:', API_KEY.length);

    const response = await fetch(`${API_URL}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('TTS Response Status:', response.status);
    console.log('TTS Response Body:', responseText.substring(0, 200));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(500).json({
        success: false,
        message: `Invalid JSON response: ${responseText}`,
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || data.detail || 'TTS request failed',
      });
    }

    // Handle various response formats from Hypa API
    let responseData = data.response;
    console.log('data.response type:', typeof responseData);

    if (typeof responseData === 'string') {
      try {
        responseData = JSON.parse(responseData);
      } catch {
        // Keep as string
      }
    }

    const audioData =
      data.audio ||
      responseData?.audio ||
      responseData?.audio_b64 ||
      data.audio_base64;
    const audioType = data.audio_type || responseData?.audio_type || 'audio/wav';
    const sampleRate = data.sample_rate || responseData?.sample_rate;

    return res.json({
      success: true,
      audio: audioData,
      audio_base64: audioData,
      audio_url: data.audio_url,
      audio_type: audioType,
      sample_rate: sampleRate,
    });
  } catch (error) {
    console.error('TTS API Error:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to convert text to speech: ${error}`,
    });
  }
});

/**
 * POST /api/asr — Automatic Speech Recognition (Transcription)
 *
 * Receives { audio (base64), audio_type, provider, model, ... } from
 * the frontend. Forwards to Hypa AI’s ASR endpoint.
 * Returns { success, text } with the transcribed text.
 *
 * Handles multiple response formats:
 *  - Direct JSON with `text` or `transcription` field
 *  - SSE (Server-Sent Events) wrapper `data: {...}`
 *  - OpenAI-style `choices[0].message.content`
 */
// Automatic Speech Recognition API
app.post('/api/asr', async (req, res) => {
  try {
    const body = req.body;

    console.log('ASR Request URL:', `${API_URL}/asr`);
    console.log('ASR Request Body:', JSON.stringify(body).substring(0, 200) + '...');
    console.log('API Key present:', !!API_KEY, 'Length:', API_KEY?.length);

    const response = await fetch(`${API_URL}/asr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('ASR Response Status:', response.status);
    console.log('ASR Response Body:', responseText.substring(0, 200));

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      return res.status(response.status).json({
        success: false,
        message: errorData.message || 'Transcription failed',
      });
    }

    // Parse response
    let data;
    try {
      // Try direct JSON parse first
      data = JSON.parse(responseText);
    } catch {
      // Parse SSE format (id: X\ndata: {...})
      const dataMatch = responseText.match(/data:\s*(\{[\s\S]*\})/);
      if (dataMatch) {
        try {
          data = JSON.parse(dataMatch[1]);
        } catch {
          return res.status(500).json({
            success: false,
            message: 'Failed to parse SSE response',
          });
        }
      } else {
        return res.status(500).json({
          success: false,
          message: `Invalid response format: ${responseText}`,
        });
      }
    }

    // Extract transcribed text
    let transcribedText = data.text || data.transcription;

    // Handle Hypa AI response format
    if (!transcribedText && data.response?.text) {
      transcribedText = data.response.text;
    }

    // Handle OpenAI-style response format
    if (!transcribedText && data.choices?.[0]?.message?.content) {
      transcribedText = data.choices[0].message.content;
    }

    // Handle other possible formats
    if (!transcribedText && data.result) {
      transcribedText = data.result;
    }

    console.log('ASR Extracted text:', transcribedText);

    return res.json({
      success: true,
      text: transcribedText,
    });
  } catch (error) {
    console.error('ASR API Error:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to transcribe audio: ${error}`,
    });
  }
});

/**
 * POST /api/mt — Machine Translation
 *
 * Receives { text, source_lang, target_lang, provider, model, ... }
 * from the frontend. Forwards to Hypa AI’s /mt endpoint.
 * Returns { success, translated_text }.
 *
 * Handles SSE and OpenAI-style response wrappers, and strips
 * any <think>...</think> tags from the model output.
 */
// Translation API
app.post('/api/mt', async (req, res) => {
  try {
    const body = req.body;

    console.log('MT Request URL:', `${API_URL}/mt`);
    console.log('MT Request Body:', JSON.stringify(body));
    console.log('API Key present:', !!API_KEY, 'Length:', API_KEY?.length);

    const response = await fetch(`${API_URL}/mt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY || '',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('MT Response Status:', response.status);
    console.log('MT Response Body:', responseText.substring(0, 200));

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      return res.status(response.status).json({
        success: false,
        message: errorData.message || 'Translation failed',
      });
    }

    // Parse SSE format
    let data;
    try {
      // Try direct JSON parse first
      data = JSON.parse(responseText);
    } catch {
      // Parse SSE format
      const dataMatch = responseText.match(/data:\s*(\{[\s\S]*\})/);
      if (dataMatch) {
        try {
          data = JSON.parse(dataMatch[1]);
        } catch {
          return res.status(500).json({
            success: false,
            message: `Failed to parse SSE response`,
          });
        }
      } else {
        return res.status(500).json({
          success: false,
          message: `Invalid response format: ${responseText}`,
        });
      }
    }

    // Extract translated text
    let translatedText = data.translated_text || data.text;

    // Handle OpenAI-style response format
    if (!translatedText && data.choices?.[0]?.message?.content) {
      let content = data.choices[0].message.content;
      // Remove <think>...</think> tags if present
      content = content.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
      translatedText = content;
    }

    return res.json({
      success: true,
      translated_text: translatedText,
    });
  } catch (error) {
    console.error('Translation API Error:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to translate text: ${error}`,
    });
  }
});

/**
 * GET /health — Simple health-check endpoint.
 * Returns { status: 'ok', timestamp } so load balancers or monitoring
 * tools can verify the server is alive.
 */
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== SOCKET.IO ====================
// Real-time communication layer.
// Handles user presence, chat rooms, and message relay.

/** Create the Socket.IO server with permissive CORS for development */
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  /**
   * user:join
   * Called immediately after a client connects.
   * Associates the socket with a userId so we can track presence.
   */
  // User joins with their ID and info
  socket.on('user:join', (userData) => {
    const userId = typeof userData === 'string' ? userData : userData.id;
    const userInfo = typeof userData === 'string' ? null : userData;

    console.log(
      `User ${userId} joined with socket ${socket.id}`,
      userInfo?.name || '',
    );
    connectedUsers.set(userId, { socketId: socket.id, userInfo });
    userSockets.set(socket.id, userId);

    // Send the complete list of online users to the newly connected user FIRST
    // so their state is populated before any incremental updates arrive.
    const onlineUsers = getOnlineUsersList(userId);
    socket.emit('users:list', onlineUsers);
    console.log(`Sent ${onlineUsers.length} online users to ${userId}`);

    // Then broadcast to OTHER users that this user came online.
    // Using broadcast.emit (not io.emit) so the joining user doesn't
    // receive their own online event, which could race with users:list.
    socket.broadcast.emit('user:online', { userId, isOnline: true, userInfo });
  });

  /**
   * chat:join
   * The client joins a specific chat room (1-on-1 conversation).
   * Socket.IO rooms ensure messages are only sent to participants.
   */
  // Join a chat room
  socket.on('chat:join', (chatId) => {
    socket.join(chatId);
    console.log(`Socket ${socket.id} joined chat ${chatId}`);
  });

  /**
   * chat:leave
   * The client leaves a chat room.
   */
  // Leave a chat room
  socket.on('chat:leave', (chatId) => {
    socket.leave(chatId);
    console.log(`Socket ${socket.id} left chat ${chatId}`);
  });

  /**
   * message:send
   * Relay a chat message to all OTHER sockets in the room.
   * The sender already has the message in their local state
   * (optimistic update), so we use socket.to() not io.to().
   */
  // Handle sending messages
  socket.on('message:send', (message) => {
    const roomId = message.roomId || message.chatId;
    console.log('Message received:', message.id, 'for room:', roomId);

    // Broadcast to all OTHER users in the room (sender already has it locally)
    socket.to(roomId).emit('message:receive', message);

    // Also send directly to the recipient's socket if they are NOT in the room.
    // This ensures they receive the message even if they haven't opened the chat.
    // The roomId format is "userA__userB" (sorted), so we extract both IDs.
    const userIds = roomId.split('__');
    const senderId = message.senderId;

    for (const uid of userIds) {
      if (uid !== senderId) {
        const recipientData = connectedUsers.get(uid);
        if (recipientData) {
          const recipientSocket = io.sockets.sockets.get(recipientData.socketId);
          if (recipientSocket && !recipientSocket.rooms.has(roomId)) {
            // Recipient is online but hasn't joined the room — send directly
            recipientSocket.emit('message:receive', message);
          }
        }
      }
    }
  });

  /**
   * user:typing
   * Broadcast typing indicator to the other participant(s).
   */
  // Handle typing indicators
  socket.on('user:typing', (data) => {
    const { chatId, userId, isTyping } = data;
    socket.to(chatId).emit('user:typing', { chatId, userId, isTyping });
  });

  /**
   * message:read
   * Notify participants that a message has been read.
   */
  // Handle message read status
  socket.on('message:read', (data) => {
    const { chatId, messageId, userId } = data;
    io.to(chatId).emit('message:read', { chatId, messageId, userId });
  });

  /**
   * disconnect
   * Clean up presence data and notify other users.
   */
  // Handle disconnect
  socket.on('disconnect', () => {
    const userId = userSockets.get(socket.id);
    if (userId) {
      const userData = connectedUsers.get(userId);
      console.log(`User ${userId} disconnected`);
      connectedUsers.delete(userId);
      userSockets.delete(socket.id);

      // Broadcast offline status with user info
      io.emit('user:offline', {
        userId,
        isOnline: false,
        userInfo: userData?.userInfo,
      });
    }
    console.log('Client disconnected:', socket.id);
  });
});

// ==================== START SERVER ====================

/** Port to listen on (default 3001 for development) */
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
🚀 LinguaFlow Server ready!
   - API:    http://localhost:${PORT}
   - Socket: ws://localhost:${PORT}
   
📡 Endpoints:
   - POST /api/tts - Text-to-Speech
   - POST /api/asr - Speech Recognition
   - POST /api/mt  - Translation
   
💬 Socket.IO Events:
   - user:join, message:send, user:typing, etc.
  `);
});

/**
 * Utility: get the machine’s local IPv4 address.
 * Printed at startup so developers can access the server from
 * other devices on the same network.
 */
// Get local IP for network access
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}
