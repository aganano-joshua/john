import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Send,
  Mic,
  MessageCircle,
  ChevronDown,
  Languages,
  FileText,
  Sparkles,
  Loader2,
  Volume2,
  Square,
  Trash2,
  Play,
  Pause,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "../context/UserContext";
import {
  useSocketCtx,
  buildRoomId,
  type ChatMessage,
} from "../context/SocketContext";
import { translateText, textToSpeech, transcribeAudio, audioUrlToBase64, fileToBase64 } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/utils";
import type { TranslationLanguage, TranslationModel, TTSLanguage, TTSModel, TTSVoice, ASRModel } from "@/types";

interface ChatViewProps {
  peerId: string | null;
  peerName?: string;
  peerAvatar?: string;
}

const TRANSLATION_LANGUAGES: TranslationLanguage[] = [
  "English",
  "Yoruba",
  "Igbo",
  "Hausa",
  "Tiv",
  "Annang",
  "Efik",
  "Ibibio",
  "Idoma",
  "Ebira",
  "Igala",
];

const TTS_LANGUAGES: TTSLanguage[] = [
  "english",
  "yoruba",
  "igbo",
  "hausa",
  "annang",
  "efik",
  "ibibio",
  "idoma",
  "tiv",
];

const TTS_VOICES: TTSVoice[] = [
  "Eniola",
  "Juliet",
  "Faith",
  "Zac",
  "tara",
  "Moyo",
  "Gbemisola",
  "Prince",
  "Emmanuel",
  "David",
];

const TRANSLATION_MODELS: TranslationModel[] = [
  "hypa-llama3-2-8b-sft-2025-12-rvl",
  "hypa-llama3-1-8b-sft-2025-10-swn",
  "llama-3-2-8b-instruct-bnb-4b-ync",
];

const TTS_MODELS: TTSModel[] = [
  "hypaai-orpheus-v5-pqq",
  "Hypa-Orpheus-V4-new",
  "hypaai-orpheus-v4-dus",
  "Hypa-Orpheus-V2",
  "hypa-orpheus-3b-0-1-ft-unslo-ldl",
];

const ASR_MODELS: ASRModel[] = [
  "wspr-small-2025-11-11-12-12--mpk",
  "hypaai-whisper-base-v1-04292-lhy",
];

export function ChatView({ peerId, peerName, peerAvatar }: ChatViewProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { messages, sendMessage, joinRoom, leaveRoom } = useSocketCtx();
  const [inputValue, setInputValue] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [processingMessage] = useState<string | null>(null);

  // ---- Audio recording state ----
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // ---- Pre-send dialog state ----
  const [preSendTranslateDialog, setPreSendTranslateDialog] = useState<{
    open: boolean;
    text: string;
  }>({ open: false, text: "" });
  const [preSendSynthesizeDialog, setPreSendSynthesizeDialog] = useState<{
    open: boolean;
    text: string;
  }>({ open: false, text: "" });
  const [preSendTranslatedText, setPreSendTranslatedText] = useState<string | null>(null);
  const [preSendAudioUrl, setPreSendAudioUrl] = useState<string | null>(null);
  const [isPreSendTranslating, setIsPreSendTranslating] = useState(false);
  const [isPreSendSynthesizing, setIsPreSendSynthesizing] = useState(false);

  // Translation dialog state
  const [translateDialog, setTranslateDialog] = useState<{
    open: boolean;
    messageId: string;
    text: string;
  }>({ open: false, messageId: "", text: "" });
  const [targetLang, setTargetLang] = useState<TranslationLanguage>("English");
  const [sourceLang, setSourceLang] = useState<TranslationLanguage>("Auto Detect");

  // Synthesize dialog state
  const [synthesizeDialog, setSynthesizeDialog] = useState<{
    open: boolean;
    messageId: string;
    text: string;
  }>({ open: false, messageId: "", text: "" });
  const [ttsLang, setTtsLang] = useState<TTSLanguage>("english");
  const [ttsVoice, setTtsVoice] = useState<TTSVoice>("Eniola");

  // Model selection state
  const [translateModel, setTranslateModel] = useState<TranslationModel>("hypa-llama3-2-8b-sft-2025-12-rvl");
  const [ttsModel, setTtsModel] = useState<TTSModel>("hypaai-orpheus-v4-dus");
  const [asrModel, setAsrModel] = useState<ASRModel>("wspr-small-2025-11-11-12-12--mpk");

  // Transcribe dialog state
  const [transcribeDialog, setTranscribeDialog] = useState<{
    open: boolean;
    messageId: string;
    audioUrl: string;
  }>({ open: false, messageId: "", audioUrl: "" });

  // Loading states
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Result dialog
  const [resultDialog, setResultDialog] = useState<{
    open: boolean;
    title: string;
    content: string;
    audioUrl?: string;
  }>({ open: false, title: "", content: "" });

  // Inline results keyed by message id
  const [inlineTranslations, setInlineTranslations] = useState<Record<string, string>>({});
  const [inlineAudio, setInlineAudio] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Deterministic room ID for this conversation
  const roomId = useMemo(
    () => (peerId && user ? buildRoomId(user.userId, peerId) : null),
    [peerId, user],
  );

  // Join / leave room when the active peer changes
  useEffect(() => {
    if (roomId) {
      joinRoom(roomId);
      return () => leaveRoom(roomId);
    }
  }, [roomId, joinRoom, leaveRoom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Filter messages for this room
  const roomMessages = useMemo(
    () => (roomId ? messages.filter((m) => m.roomId === roomId) : []),
    [messages, roomId],
  );

  // ---- Send ----
  const handleSend = () => {
    if (!inputValue.trim() || !roomId || !user) return;

    const msg: ChatMessage = {
      id: `${Date.now()}-${user.userId}`,
      roomId,
      content: inputValue.trim(),
      senderId: user.userId,
      senderName: user.name,
      timestamp: new Date(),
      type: "text",
    };

    sendMessage(msg);
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ---- Audio Recording ----
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedAudioBlob(blob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please allow permission.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const discardRecording = useCallback(() => {
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    setRecordingDuration(0);
    setIsPlayingPreview(false);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  }, [recordedAudioUrl]);

  const togglePreviewPlayback = useCallback(() => {
    if (!recordedAudioUrl) return;
    if (isPlayingPreview && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      const audio = new Audio(recordedAudioUrl);
      audio.onended = () => setIsPlayingPreview(false);
      audio.play();
      previewAudioRef.current = audio;
      setIsPlayingPreview(true);
    }
  }, [recordedAudioUrl, isPlayingPreview]);

  const sendRecordedAudio = useCallback(async () => {
    if (!recordedAudioBlob || !roomId || !user) return;
    try {
      const base64 = await fileToBase64(new File([recordedAudioBlob], "recording.webm"));
      const audioDataUrl = `data:audio/webm;base64,${base64}`;
      const msg: ChatMessage = {
        id: `${Date.now()}-${user.userId}`,
        roomId,
        content: "🎤 Voice message",
        senderId: user.userId,
        senderName: user.name,
        timestamp: new Date(),
        type: "audio",
        audioUrl: audioDataUrl,
      };
      sendMessage(msg);
      discardRecording();
    } catch {
      toast({
        title: "Error",
        description: "Failed to send voice message",
        variant: "destructive",
      });
    }
  }, [recordedAudioBlob, roomId, user, sendMessage, discardRecording, toast]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // ---- Pre-send: Translate & Send ----
  const openPreSendTranslate = () => {
    if (!inputValue.trim()) return;
    setPreSendTranslateDialog({ open: true, text: inputValue.trim() });
    setPreSendTranslatedText(null);
  };

  const executePreSendTranslate = async () => {
    const { text } = preSendTranslateDialog;
    setIsPreSendTranslating(true);
    try {
      const result = await translateText({
        text,
        target_lang: targetLang,
        source_lang: sourceLang,
        provider: "hypaai",
        model: translateModel,
        stream: false,
      });
      if (result.success && result.translated_text) {
        setPreSendTranslatedText(result.translated_text);
      } else {
        toast({
          title: "Translation Failed",
          description: result.message || "Could not translate",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to translate message",
        variant: "destructive",
      });
    } finally {
      setIsPreSendTranslating(false);
    }
  };

  const sendTranslatedText = () => {
    if (!preSendTranslatedText || !roomId || !user) return;
    const msg: ChatMessage = {
      id: `${Date.now()}-${user.userId}`,
      roomId,
      content: preSendTranslatedText,
      senderId: user.userId,
      senderName: user.name,
      timestamp: new Date(),
      type: "text",
      translatedText: preSendTranslateDialog.text,
    };
    sendMessage(msg);
    setInputValue("");
    setPreSendTranslateDialog({ open: false, text: "" });
    setPreSendTranslatedText(null);
    inputRef.current?.focus();
  };

  // ---- Pre-send: Synthesize & Send ----
  const openPreSendSynthesize = () => {
    if (!inputValue.trim()) return;
    setPreSendSynthesizeDialog({ open: true, text: inputValue.trim() });
    setPreSendAudioUrl(null);
  };

  const executePreSendSynthesize = async () => {
    const { text } = preSendSynthesizeDialog;
    setIsPreSendSynthesizing(true);
    try {
      const result = await textToSpeech({
        text,
        provider: "hypaai",
        model: ttsModel,
        voice: ttsVoice,
        language: ttsLang,
      });
      if (result.success && (result.audio_base64 || result.audio_url)) {
        const audioUrl = result.audio_url
          ? result.audio_url
          : `data:audio/wav;base64,${result.audio_base64}`;
        setPreSendAudioUrl(audioUrl);
      } else {
        toast({
          title: "Synthesis Failed",
          description: result.message || "Could not synthesize speech",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to synthesize speech",
        variant: "destructive",
      });
    } finally {
      setIsPreSendSynthesizing(false);
    }
  };

  const sendSynthesizedAudio = () => {
    if (!preSendAudioUrl || !roomId || !user) return;
    const msg: ChatMessage = {
      id: `${Date.now()}-${user.userId}`,
      roomId,
      content: preSendSynthesizeDialog.text,
      senderId: user.userId,
      senderName: user.name,
      timestamp: new Date(),
      type: "audio",
      audioUrl: preSendAudioUrl,
    };
    sendMessage(msg);
    setInputValue("");
    setPreSendSynthesizeDialog({ open: false, text: "" });
    setPreSendAudioUrl(null);
    inputRef.current?.focus();
  };

  // ---- Translate ----
  const openTranslateDialog = (messageId: string, text: string) => {
    setTranslateDialog({ open: true, messageId, text });
    setOpenDropdown(null);
  };

  const executeTranslate = async () => {
    const { messageId, text } = translateDialog;
    setIsTranslating(true);
    try {
      const result = await translateText({
        text,
        target_lang: targetLang,
        source_lang: sourceLang,
        provider: "hypaai",
        model: translateModel,
        stream: false,
      });
      if (result.success && result.translated_text) {
        setInlineTranslations((prev) => ({
          ...prev,
          [messageId]: result.translated_text!,
        }));
        setTranslateDialog((d) => ({ ...d, open: false }));
        setResultDialog({
          open: true,
          title: "Translation",
          content: result.translated_text,
        });
      } else {
        toast({
          title: "Translation Failed",
          description: result.message || "Could not translate",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to translate message",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  // ---- Synthesize ----
  const openSynthesizeDialog = (messageId: string, text: string) => {
    setSynthesizeDialog({ open: true, messageId, text });
    setOpenDropdown(null);
  };

  const executeSynthesize = async () => {
    const { messageId, text } = synthesizeDialog;
    setIsSynthesizing(true);
    try {
      const result = await textToSpeech({
        text,
        provider: "hypaai",
        model: ttsModel,
        voice: ttsVoice,
        language: ttsLang,
      });
      if (result.success && (result.audio_base64 || result.audio_url)) {
        const audioUrl = result.audio_url
          ? result.audio_url
          : `data:audio/wav;base64,${result.audio_base64}`;
        setInlineAudio((prev) => ({ ...prev, [messageId]: audioUrl }));
        setSynthesizeDialog((d) => ({ ...d, open: false }));
        setResultDialog({
          open: true,
          title: "Synthesized Speech",
          content: "Audio generated successfully",
          audioUrl,
        });
      } else {
        toast({
          title: "Synthesis Failed",
          description: result.message || "Could not synthesize speech",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to synthesize speech",
        variant: "destructive",
      });
    } finally {
      setIsSynthesizing(false);
    }
  };

  // ---- Transcribe ----
  const openTranscribeDialog = (messageId: string) => {
    const audioUrl = inlineAudio[messageId];
    if (!audioUrl) {
      toast({
        title: "No Audio",
        description:
          "Synthesize the message first to get audio, then transcribe.",
        variant: "destructive",
      });
      return;
    }
    setTranscribeDialog({ open: true, messageId, audioUrl });
    setOpenDropdown(null);
  };

  const executeTranscribe = async () => {
    const { audioUrl } = transcribeDialog;
    setIsTranscribing(true);
    try {
      let base64: string;
      if (audioUrl.includes("base64,")) {
        base64 = audioUrl.split(",")[1];
      } else if (audioUrl.startsWith("http")) {
        base64 = await audioUrlToBase64(audioUrl);
      } else {
        base64 = audioUrl;
      }

      const result = await transcribeAudio({
        audio: base64,
        audio_type: "base64",
        provider: "hypaai",
        model: asrModel,
      });
      if (result.success && result.text) {
        setTranscribeDialog((d) => ({ ...d, open: false }));
        setResultDialog({
          open: true,
          title: "Transcription",
          content: result.text,
        });
      } else {
        toast({
          title: "Transcription Failed",
          description: result.message || "Could not transcribe audio",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to transcribe audio",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  // ---- Empty state ----
  if (!peerId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 dark:from-[#0b141a] dark:to-[#111b21]">
        <div className="text-center max-w-md px-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            <MessageCircle
              className="w-12 h-12 text-white"
              strokeWidth={1.5}
            />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-3">
            LinguaFlow Web
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
            Send and receive messages with real-time translation.
            <br />
            Select a chat to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] relative">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.06] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-2.5 bg-linear-to-r from-indigo-600 to-purple-600 shadow-md">
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={peerAvatar} alt={peerName} />
            <AvatarFallback className="bg-white text-indigo-600 font-semibold text-sm">
              {peerName
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-indigo-600 rounded-full" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-white text-[16px]">
            {peerName || "Unknown"}
          </h2>
          <p className="text-xs text-white/80">online</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 md:px-16 relative z-10" ref={scrollRef}>
        <div className="py-6 space-y-3">
          {roomMessages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-800/50 rounded-lg px-4 py-2 inline-block shadow-sm">
                No messages yet. Say hello!
              </p>
            </div>
          )}

          {roomMessages.map((message) => {
            const isOwn = message.senderId === user?.userId;
            const translation = inlineTranslations[message.id];
            const audio = inlineAudio[message.id];

            return (
              <div
                key={message.id}
                className={`flex gap-1 ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div className="relative group max-w-[65%]">
                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "relative rounded-lg px-3 py-2 shadow-sm",
                      isOwn
                        ? "bg-linear-to-br from-indigo-500 to-purple-500 text-white rounded-br-none"
                        : "bg-white dark:bg-[#202c33] text-gray-900 dark:text-gray-100 rounded-bl-none",
                    )}
                  >
                    {/* Sender name for received messages */}
                    {!isOwn && (
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">
                        {message.senderName}
                      </p>
                    )}

                    {/* Audio message */}
                    {message.type === "audio" && message.audioUrl ? (
                      <div>
                        <p className="text-[14.2px] leading-[19px] break-words mb-1.5">
                          {message.content}
                        </p>
                        <audio controls className="w-full h-8" style={{ maxWidth: 260 }}>
                          <source src={message.audioUrl} />
                        </audio>
                      </div>
                    ) : (
                      <p className="text-[14.2px] leading-[19px] break-words">
                        {message.content}
                      </p>
                    )}

                    {/* Show original text if this was a translated send */}
                    {message.translatedText && (
                      <div
                        className={cn(
                          "mt-1 pt-1 border-t text-xs italic",
                          isOwn
                            ? "border-white/30 text-white/70"
                            : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500",
                        )}
                      >
                        <Languages className="inline w-3 h-3 mr-1 -mt-0.5" />
                        Original: {message.translatedText}
                      </div>
                    )}

                    {/* Inline translation */}
                    {translation && (
                      <div
                        className={cn(
                          "mt-1.5 pt-1.5 border-t text-xs italic",
                          isOwn
                            ? "border-white/30 text-white/90"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400",
                        )}
                      >
                        <Languages className="inline w-3 h-3 mr-1 -mt-0.5" />
                        {translation}
                      </div>
                    )}

                    {/* Inline audio player */}
                    {audio && (
                      <div className="mt-1.5 pt-1">
                        <audio controls className="w-full h-8" style={{ maxWidth: 260 }}>
                          <source src={audio} type="audio/wav" />
                        </audio>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span
                        className={cn(
                          "text-[11px]",
                          isOwn ? "text-white/70" : "text-gray-500",
                        )}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions dropdown — always rendered, visible on hover via CSS */}
                  <div
                    className={cn(
                      "absolute top-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity",
                      isOwn ? "-left-10" : "-right-10",
                    )}
                  >
                    <DropdownMenu
                      modal={false}
                      open={openDropdown === message.id}
                      onOpenChange={(open) =>
                        setOpenDropdown(open ? message.id : null)
                      }
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-md transition-all hover:scale-110"
                          disabled={processingMessage === message.id}
                        >
                          {processingMessage === message.id ? (
                            <Loader2 className="w-4 h-4 text-gray-700 dark:text-gray-300 animate-spin" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align={isOwn ? "end" : "start"}
                        className="w-48"
                        onCloseAutoFocus={(e) => e.preventDefault()}
                      >
                        <DropdownMenuItem
                          className="cursor-pointer gap-2"
                          onSelect={() =>
                            openTranslateDialog(message.id, message.content)
                          }
                        >
                          <Languages className="w-4 h-4 text-indigo-600" />
                          Translate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer gap-2"
                          onSelect={() =>
                            openSynthesizeDialog(message.id, message.content)
                          }
                        >
                          <Volume2 className="w-4 h-4 text-pink-600" />
                          Synthesize (TTS)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer gap-2"
                          onSelect={() => openTranscribeDialog(message.id)}
                          disabled={!inlineAudio[message.id]}
                        >
                          <FileText className="w-4 h-4 text-purple-600" />
                          Transcribe (ASR)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="relative z-10 px-4 py-3 bg-gray-100 dark:bg-[#202c33]">
        {/* Recording state */}
        {isRecording ? (
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={discardRecording}
              className="h-11 w-11 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
            <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#2a3942] rounded-lg">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <div className="flex-1 flex items-center gap-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-400 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 20 + 4}px`,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[40px]">
                {formatDuration(recordingDuration)}
              </span>
            </div>
            <Button
              size="icon"
              onClick={() => { stopRecording(); }}
              className="h-11 w-11 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md"
            >
              <Square className="w-4 h-4" />
            </Button>
          </div>
        ) : recordedAudioUrl ? (
          /* Recorded audio preview */
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={discardRecording}
              className="h-11 w-11 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={togglePreviewPlayback}
              className="h-10 w-10 rounded-full shrink-0"
            >
              {isPlayingPreview ? (
                <Pause className="w-5 h-5 text-indigo-600" />
              ) : (
                <Play className="w-5 h-5 text-indigo-600" />
              )}
            </Button>
            <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg px-3 py-2">
              <audio controls className="w-full h-8">
                <source src={recordedAudioUrl} type="audio/webm" />
              </audio>
            </div>
            <span className="text-xs text-gray-500 min-w-[40px] text-center shrink-0">
              {formatDuration(recordingDuration)}
            </span>
            <Button
              size="icon"
              onClick={sendRecordedAudio}
              className="h-11 w-11 bg-linear-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full shadow-md shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          /* Normal text input */
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                placeholder="Type a message"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-11 pr-11 bg-white dark:bg-[#2a3942] border-0 rounded-lg text-[15px] focus-visible:ring-0"
              />
            </div>

            {inputValue.trim() ? (
              <div className="flex items-center gap-1">
                {/* Send options dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      className="cursor-pointer gap-2"
                      onSelect={openPreSendTranslate}
                    >
                      <Languages className="w-4 h-4 text-indigo-600" />
                      Translate & Send
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer gap-2"
                      onSelect={openPreSendSynthesize}
                    >
                      <Volume2 className="w-4 h-4 text-pink-600" />
                      Synthesize & Send Voice
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Send button */}
                <Button
                  size="icon"
                  onClick={handleSend}
                  className="h-11 w-11 bg-linear-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full shadow-md"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <Button
                size="icon"
                onClick={startRecording}
                className="h-11 w-11 bg-linear-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full shadow-md"
              >
                <Mic className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ---- Translate options dialog ---- */}
      <Dialog
        open={translateDialog.open}
        onOpenChange={(open) =>
          setTranslateDialog((d) => ({ ...d, open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Translate Message
            </DialogTitle>
            <DialogDescription>
              Choose source and target languages
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 italic border-l-2 border-indigo-400 pl-3">
              &ldquo;{translateDialog.text}&rdquo;
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  From
                </label>
                <Select
                  value={sourceLang}
                  onValueChange={(v) =>
                    setSourceLang(v as TranslationLanguage)
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                    {TRANSLATION_LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  To
                </label>
                <Select
                  value={targetLang}
                  onValueChange={(v) =>
                    setTargetLang(v as TranslationLanguage)
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSLATION_LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Model
              </label>
              <Select
                value={translateModel}
                onValueChange={(v) => setTranslateModel(v as TranslationModel)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSLATION_MODELS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={executeTranslate}
              disabled={isTranslating}
              className="w-full bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4 mr-2" />
                  Translate
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Synthesize options dialog ---- */}
      <Dialog
        open={synthesizeDialog.open}
        onOpenChange={(open) =>
          setSynthesizeDialog((d) => ({ ...d, open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Text-to-Speech
            </DialogTitle>
            <DialogDescription>
              Choose voice and language for synthesis
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 italic border-l-2 border-pink-400 pl-3">
              &ldquo;{synthesizeDialog.text}&rdquo;
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Language
                </label>
                <Select
                  value={ttsLang}
                  onValueChange={(v) => setTtsLang(v as TTSLanguage)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TTS_LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l.charAt(0).toUpperCase() + l.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Voice
                </label>
                <Select
                  value={ttsVoice}
                  onValueChange={(v) => setTtsVoice(v as TTSVoice)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TTS_VOICES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Model
              </label>
              <Select
                value={ttsModel}
                onValueChange={(v) => setTtsModel(v as TTSModel)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TTS_MODELS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={executeSynthesize}
              disabled={isSynthesizing}
              className="w-full bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Synthesize
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Transcribe options dialog ---- */}
      <Dialog
        open={transcribeDialog.open}
        onOpenChange={(open) =>
          setTranscribeDialog((d) => ({ ...d, open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Transcribe Audio
            </DialogTitle>
            <DialogDescription>
              Choose model for speech recognition
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Volume2 className="w-5 h-5 text-purple-600 shrink-0" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Audio ready for transcription
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Model
              </label>
              <Select
                value={asrModel}
                onValueChange={(v) => setAsrModel(v as ASRModel)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASR_MODELS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={executeTranscribe}
              disabled={isTranscribing}
              className="w-full bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Transcribe
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Pre-send Translate dialog ---- */}
      <Dialog
        open={preSendTranslateDialog.open}
        onOpenChange={(open) =>
          setPreSendTranslateDialog((d) => ({ ...d, open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Translate & Send
            </DialogTitle>
            <DialogDescription>
              Translate your message before sending
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 italic border-l-2 border-indigo-400 pl-3">
              &ldquo;{preSendTranslateDialog.text}&rdquo;
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">From</label>
                <Select value={sourceLang} onValueChange={(v) => setSourceLang(v as TranslationLanguage)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Auto Detect">Auto Detect</SelectItem>
                    {TRANSLATION_LANGUAGES.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">To</label>
                <Select value={targetLang} onValueChange={(v) => setTargetLang(v as TranslationLanguage)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSLATION_LANGUAGES.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Model</label>
              <Select value={translateModel} onValueChange={(v) => setTranslateModel(v as TranslationModel)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSLATION_MODELS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Translated text preview */}
            {preSendTranslatedText && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Translated:</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{preSendTranslatedText}</p>
              </div>
            )}

            <div className="flex gap-2">
              {!preSendTranslatedText ? (
                <Button
                  onClick={executePreSendTranslate}
                  disabled={isPreSendTranslating}
                  className="flex-1 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                >
                  {isPreSendTranslating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Translating...</>
                  ) : (
                    <><Languages className="w-4 h-4 mr-2" />Translate</>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setPreSendTranslatedText(null)}
                    className="flex-1"
                  >
                    Re-translate
                  </Button>
                  <Button
                    onClick={sendTranslatedText}
                    className="flex-1 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Pre-send Synthesize dialog ---- */}
      <Dialog
        open={preSendSynthesizeDialog.open}
        onOpenChange={(open) =>
          setPreSendSynthesizeDialog((d) => ({ ...d, open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Synthesize & Send Voice
            </DialogTitle>
            <DialogDescription>
              Convert your text to speech and send as a voice message
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 italic border-l-2 border-pink-400 pl-3">
              &ldquo;{preSendSynthesizeDialog.text}&rdquo;
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Language</label>
                <Select value={ttsLang} onValueChange={(v) => setTtsLang(v as TTSLanguage)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TTS_LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Voice</label>
                <Select value={ttsVoice} onValueChange={(v) => setTtsVoice(v as TTSVoice)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TTS_VOICES.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Model</label>
              <Select value={ttsModel} onValueChange={(v) => setTtsModel(v as TTSModel)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TTS_MODELS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Audio preview */}
            {preSendAudioUrl && (
              <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                <p className="text-xs font-medium text-pink-700 dark:text-pink-400 mb-2">Preview:</p>
                <audio controls className="w-full h-8">
                  <source src={preSendAudioUrl} type="audio/wav" />
                </audio>
              </div>
            )}

            <div className="flex gap-2">
              {!preSendAudioUrl ? (
                <Button
                  onClick={executePreSendSynthesize}
                  disabled={isPreSendSynthesizing}
                  className="flex-1 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white"
                >
                  {isPreSendSynthesizing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Synthesizing...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Synthesize</>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setPreSendAudioUrl(null)}
                    className="flex-1"
                  >
                    Re-synthesize
                  </Button>
                  <Button
                    onClick={sendSynthesizedAudio}
                    className="flex-1 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Voice
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Result dialog ---- */}
      <Dialog
        open={resultDialog.open}
        onOpenChange={(open) =>
          setResultDialog({ ...resultDialog, open })
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {resultDialog.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Result of {resultDialog.title.toLowerCase()} operation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {resultDialog.content}
            </p>
            {resultDialog.audioUrl && (
              <audio controls className="w-full">
                <source src={resultDialog.audioUrl} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
