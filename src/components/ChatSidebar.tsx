import { useState } from "react";
import { Search, LogOut, MoreVertical, Wifi, WifiOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils";
import { useUser } from "../context/UserContext";
import { useSocketCtx } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";

interface ChatSidebarProps {
  onChatSelect: (chatId: string) => void;
  activeChat: string | null;
}

export function ChatSidebar({ onChatSelect, activeChat }: ChatSidebarProps) {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const { onlineUsers, isConnected } = useSocketCtx();
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredUsers = onlineUsers.filter((u) =>
    searchQuery
      ? u.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#111b21] w-[400px] border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white">Chats</h1>
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-300" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-300" />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 rounded-full h-10 w-10"
          >
            <MoreVertical className="w-5 h-5" />
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

      {/* Online count badge */}
      <div className="px-4 py-1.5">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Online &mdash; {onlineUsers.length}
        </span>
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
                      <span className="text-[12px] text-green-600 dark:text-green-400 shrink-0 font-medium">
                        online
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[14px] text-gray-600 dark:text-gray-400 truncate">
                        Tap to start chatting
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
    </div>
  );
}
