# LinguaFlow Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Hypa AI API key (get from https://hypaintelligence.com)

### Installation Steps

#### 1. Install Frontend Dependencies

```bash
npm install
```

This will install:
- React Router DOM for routing
- Socket.IO Client for real-time chat
- Radix UI components (Avatar, Dialog, Dropdown, ScrollArea, Select, Tabs, Toast)
- Tailwind CSS for styling
- Lucide React for icons

#### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

This will install:
- Express web server
- Socket.IO for WebSocket connections
- CORS middleware
- dotenv for environment variables

#### 3. Configure Environment Variables

**Frontend** - Create `.env` in project root:
```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

**Backend** - Create `.env` in `backend/` folder:
```env
PORT=3001
HYPA_API_URL=https://api.hypaintelligence.com/v2/developer
HYPA_API_KEY=your_actual_api_key_here
```

⚠️ **Important**: Replace `your_actual_api_key_here` with your real Hypa AI API key!

#### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

You should see:
```
🚀 LinguaFlow Server ready!
   - API:    http://localhost:3001
   - Socket: ws://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

You should see:
```
VITE v7.2.4  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

#### 5. Open the Application

Navigate to http://localhost:5173 in your browser.

---

## 📁 Project Structure

```
linguaflow/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── avatar.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── toaster.tsx
│   │   ├── AuthGuard.tsx          # Example route wrapper
│   │   ├── ChatSidebar.tsx        # Chat list sidebar
│   │   ├── ChatView.tsx           # Message view & AI actions
│   │   ├── MainLayout.tsx         # Main app layout
│   │   └── ProtectedRoute.tsx     # Auth protection wrapper
│   ├── context/
│   │   └── UserContext.tsx        # User auth context
│   ├── hooks/
│   │   ├── use-toast.ts           # Toast notification hook
│   │   └── useSocket.ts           # Socket.IO hook
│   ├── lib/
│   │   ├── types.ts               # TypeScript types
│   │   └── utils.ts               # Utility functions
│   ├── pages/
│   │   ├── About.tsx              # About page
│   │   ├── Home.tsx               # Chat interface page
│   │   └── Login.tsx              # Login page
│   ├── services/
│   │   └── api.ts                 # API service functions
│   ├── App.tsx                    # Main app component
│   ├── main.tsx                   # Entry point
│   └── router.tsx                 # Route configuration
├── backend/
│   ├── server.js                  # Express + Socket.IO server
│   ├── package.json               # Backend dependencies
│   └── .env                       # Backend environment vars
├── package.json                   # Frontend dependencies
├── .env                           # Frontend environment vars
└── vite.config.ts                 # Vite configuration
```

---

## 🎯 Features Implemented

### ✅ Authentication System
- User context with userId, name, email, socketId
- Protected routes requiring login
- Login page with email/password
- Auto-generate name from email

### ✅ Real-Time Chat
- Socket.IO integration
- User presence tracking (online/offline)
- Message sending/receiving in real-time
- Chat room management (join/leave)
- Typing indicators support
- Read receipts support

### ✅ AI-Powered Features
Each message has a dropdown menu with 3 AI actions:

**1. Translate** 🌍
- Translates message text to English (configurable)
- Uses Hypa AI Translation API
- Shows result in a dialog

**2. Transcribe** 📝
- Converts audio messages to text
- Uses Hypa AI ASR (Automatic Speech Recognition)
- Shows transcription in a dialog

**3. Synthesize** 🔊
- Converts text messages to speech
- Uses Hypa AI TTS (Text-to-Speech)
- Plays audio in a dialog

### ✅ WhatsApp-Style UI
- Gradient theme (indigo-600 to purple-600)
- Background pattern for chat area
- Message bubbles with hover interactions
- Loading states for AI operations
- Toast notifications for errors
- Responsive design

---

## 🔧 API Endpoints

### Backend Server (http://localhost:3001)

**POST /api/tts** - Text-to-Speech
```json
{
  "text": "Hello world",
  "provider": "hypaai",
  "model": "hypaai-orpheus-v4-dus",
  "voice": "Eniola",
  "language": "english"
}
```

**POST /api/asr** - Speech Recognition
```json
{
  "audio": "base64_encoded_audio",
  "audio_type": "base64",
  "provider": "hypaai",
  "model": "wspr-small-2025-11-11-12-12--mpk"
}
```

**POST /api/mt** - Machine Translation
```json
{
  "text": "Hello",
  "source_lang": "auto",
  "target_lang": "english",
  "provider": "hypaai",
  "model": "hypa-llama3-2-8b-sft-2025-12-rvl"
}
```

**GET /health** - Health Check
Returns server status

---

## 🔌 Socket.IO Events

### Client → Server

- `user:join` - User connects with info
- `chat:join` - Join a chat room
- `chat:leave` - Leave a chat room
- `message:send` - Send a message
- `user:typing` - Update typing status
- `message:read` - Mark message as read

### Server → Client

- `user:online` - User came online
- `user:offline` - User went offline
- `users:list` - List of online users
- `message:receive` - New message received
- `user:typing` - Someone is typing
- `message:read` - Message was read

---

## 🎨 Color Scheme

The application uses a consistent gradient theme throughout:

- **Primary Gradient**: `from-indigo-600 to-purple-600`
- **Message Bubbles (Own)**: `from-indigo-500 to-purple-500`
- **Login Background**: `from-indigo-50 via-purple-50 to-pink-50`
- **Icons**: Indigo-600, Purple-600, Pink-600

---

## 🧪 Testing the Application

### Test Chat Functionality

1. Login with any email (e.g., `test@example.com`)
2. You'll see the chat sidebar and empty chat view
3. Select a chat from sidebar (or it will use mock data)
4. Type a message and press Enter
5. Message appears in chat view

### Test AI Features

**Test Translation:**
1. Send a message with text
2. Hover over the message bubble
3. Click the dropdown button (ChevronDown icon)
4. Click "Translate"
5. See translation in dialog

**Test Synthesis:**
1. Send a message with text
2. Hover and open dropdown
3. Click "Synthesize"
4. Audio player appears in dialog

**Test Transcription:**
1. Send an audio message (or use synthesized audio)
2. Hover and open dropdown
3. Click "Transcribe"
4. See text transcription in dialog

---

## 🐛 Troubleshooting

### Backend won't start
- Check if port 3001 is available
- Verify `.env` file exists in backend folder
- Make sure all dependencies are installed: `npm install`

### Frontend can't connect to backend
- Verify backend is running on port 3001
- Check `.env` file has correct `VITE_API_URL`
- Check browser console for CORS errors

### AI features not working
- Verify `HYPA_API_KEY` is set in backend `.env`
- Check backend logs for API errors
- Ensure you have internet connectivity
- Verify API key is valid and has credits

### Socket.IO not connecting
- Check backend server is running
- Verify `VITE_SOCKET_URL` in frontend `.env`
- Check browser console for WebSocket errors
- Try refreshing the page

---

## 📝 Next Steps

### Suggested Improvements

1. **Persistent Storage**
   - Add database (MongoDB, PostgreSQL)
   - Store messages, users, chat rooms
   - Implement message history

2. **User Management**
   - Real authentication (JWT, OAuth)
   - User profiles with avatars
   - Friend requests/contacts

3. **Enhanced Chat Features**
   - File sharing
   - Image/video messages
   - Voice messages (record from browser)
   - Message editing/deletion
   - Reply to specific messages

4. **AI Enhancements**
   - Language auto-detection
   - Multiple target languages for translation
   - Voice selection for TTS
   - Real-time translation as you type

5. **UI Improvements**
   - Dark mode toggle
   - Custom themes
   - Emoji picker
   - Message search
   - Chat settings

---

## 📄 License

MIT

---

## 🤝 Support

For issues or questions:
- Check backend console logs
- Check frontend browser console
- Verify environment variables
- Test with curl/Postman for API debugging

---

**Enjoy using LinguaFlow! 🎉**
