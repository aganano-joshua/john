/**
 * ChatSidebar.tsx
 * ===============
 * Left sidebar of the LinguaFlow chat application.
 *
 * Responsibilities:
 * - Show real-time connection status (online / offline indicator)
 * - Search and filter the list of online users
 * - Let the user select a peer to open a conversation
 * - Display current user's profile at the bottom with a logout button
 * - Provide a **Settings dialog** (gear icon) where the user can
 *   choose their "default display language" and preferred translation model.
 *   When a non-English language is selected, every message the user sees
 *   will be auto-translated into that language on THEIR screen only.
 */

import { useState } from "react";
import { Search, LogOut, Settings, Wifi, WifiOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { cn } from "@/utils";
import { useUser } from "../context/UserContext";
import { useSocketCtx, buildRoomId } from "../context/SocketContext";
import { useSettings } from "../context/SettingsContext";
import { useNavigate } from "react-router-dom";
import type { TranslationLanguage, TranslationModel } from "@/types";

/* ─── Component props ─── */
interface ChatSidebarProps {
  /** Called when the user clicks a peer — opens the chat view */
  onChatSelect: (chatId: string) => void;
  /** Currently highlighted peer id (used for active-state styling) */
  activeChat: string | null;
}

/* ─── Supported display languages for the settings dialog ─── */
const DISPLAY_LANGUAGES: TranslationLanguage[] = [
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

/* ─── Translation model options for the settings dialog ─── */
const SETTINGS_MODELS: TranslationModel[] = [
  "hypa-llama3-2-8b-sft-2025-12-rvl",
  "hypa-llama3-1-8b-sft-2025-10-swn",
  "llama-3-2-8b-instruct-bnb-4b-ync",
];

/**
 * ChatSidebar
 * Renders the sidebar panel with user list, search, profile, and settings.
 */
export function ChatSidebar({ onChatSelect, activeChat }: ChatSidebarProps) {
  /* ── Context hooks ── */
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const { onlineUsers, isConnected, unreadCounts } = useSocketCtx();
  const { settings, updateSettings } = useSettings();

  /* ── Local state ── */
  const [searchQuery, setSearchQuery] = useState("");
  /** Controls visibility of the Settings dialog */
  const [settingsOpen, setSettingsOpen] = useState(false);

  /** Log the user out and redirect to the login page */
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  /**
   * Filter the online-users list by the current search query.
   * If the search bar is empty every online user is shown.
   */
  const filteredUsers = onlineUsers.filter((u) =>
    searchQuery
      ? u.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#111b21] w-[400px] border-r border-gray-200 dark:border-gray-800">
      {/* ─── Header — title, connection indicator, settings gear ─── */}
      <div className="bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-5">
        <div className="flex items-center justify-between">
          {/* Title + live connection indicator (green = connected) */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white">Chats</h1>
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-300" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-300" />
            )}
          </div>

          {/* Settings gear icon — opens the settings dialog */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="text-white hover:bg-white/10 rounded-full h-10 w-10"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3 bg-white dark:bg-[#111b21]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
          <Input
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-[42px] bg-gray-100 dark:bg-[#202c33] border-0 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500 text-sm"
          />
        </div>
      </div>

      {/* ─── Online count badge + auto-translate indicator ─── */}
      <div className="px-4 py-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Online &mdash; {onlineUsers.length}
        </span>
        {/* Small badge showing the user's auto-translate language (if set) */}
        {settings.defaultLanguage !== "English" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium">
            Auto: {settings.defaultLanguage}
          </span>
        )}
      </div>

      {/* User List */}
      <ScrollArea className="flex-1">
        <div>
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-linear-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {searchQuery ? "No chats found" : "No online users"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? "Try a different search term"
                  : "Waiting for others to connect..."}
              </p>
            </div>
          ) : (
            filteredUsers.map((peer) => {
              const avatar =
                peer.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${peer.name}`;
              const initials = peer.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2);

              // Calculate unread count for this peer's conversation
              const peerRoomId = user
                ? buildRoomId(user.userId, peer.id)
                : "";
              const unread = unreadCounts[peerRoomId] || 0;

              return (
                <button
                  key={peer.id}
                  onClick={() => onChatSelect(peer.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#202c33] transition-colors",
                    activeChat === peer.id && "bg-indigo-50 dark:bg-[#2a3942]",
                  )}
                >
                  {/* Avatar with online dot */}
                  <div className="relative">
                    <Avatar className="w-[50px] h-[50px]">
                      <AvatarImage src={avatar} alt={peer.name} />
                      <AvatarFallback className="bg-linear-to-br from-indigo-400 to-purple-400 text-white font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#111b21] rounded-full" />
                  </div>

                  <div className="flex-1 min-w-0 border-b border-gray-200 dark:border-gray-800 pb-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-[17px] text-gray-900 dark:text-white truncate">
                        {peer.name}
                      </span>
                      {unread > 0 ? (
                        /* Unread message count badge */
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold shrink-0">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      ) : (
                        <span className="text-[12px] text-green-600 dark:text-green-400 shrink-0 font-medium">
                          online
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[14px] text-gray-600 dark:text-gray-400 truncate">
                        {unread > 0 ? `${unread} new message${unread > 1 ? "s" : ""}` : "Tap to start chatting"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Profile Section at Bottom */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-[#1f2c34]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="w-10 h-10">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                  user?.name}`}
                alt={user?.name}
              />
              <AvatarFallback className="bg-linear-to-br from-indigo-500 to-purple-500 text-white text-sm font-semibold">
                {user?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full h-9 w-9 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    {/* </div> */}

      {/* ────────────────────────────────────────────────────
           Settings Dialog
           ────────────────────────────────────────────────────
           Lets the user pick:
           1. Default display language — messages are auto-translated
              into this language on the user's screen.
           2. Translation model — which AI model to use.
      */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Settings
            </DialogTitle>
            <DialogDescription>
              Configure your default message language and translation model
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* ── Default language selector ── */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Default Display Language
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Messages will be automatically translated into this language on
                your screen. Set to &ldquo;English&rdquo; to disable
                auto-translation.
              </p>
              <Select
                value={settings.defaultLanguage}
                onValueChange={(v) =>
                  updateSettings({
                    defaultLanguage: v as TranslationLanguage,
                  })
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISPLAY_LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                      {lang === "English" && " (no auto-translate)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Translation model selector ── */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Translation Model
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Choose the AI model used for auto-translation.
              </p>
              <Select
                value={settings.translationModel}
                onValueChange={(v) =>
                  updateSettings({
                    translationModel: v as TranslationModel,
                  })
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SETTINGS_MODELS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Current status indicator ── */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {settings.defaultLanguage === "English" ? (
                  <>
                    Auto-translation is{" "}
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      disabled
                    </span>
                    . Messages will appear in their original language.
                  </>
                ) : (
                  <>
                    Auto-translation is{" "}
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      enabled
                    </span>
                    . Messages will be translated to{" "}
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {settings.defaultLanguage}
                    </span>{" "}
                    on your screen.
                  </>
                )}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
