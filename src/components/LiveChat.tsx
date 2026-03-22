"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: Date;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

interface LiveChatProps {
  onToolCall?: (
    name: string,
    args: Record<string, unknown>
  ) => void;
}

export default function LiveChat({ onToolCall }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (sessionId) {
        fetch(`/api/live?sessionId=${sessionId}`, { method: "DELETE" }).catch(
          () => {}
        );
      }
    };
  }, [sessionId]);

  const addMessage = useCallback(
    (role: ChatMessage["role"], content: string, extra?: Partial<ChatMessage>) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role,
          content,
          timestamp: new Date(),
          ...extra,
        },
      ]);
    },
    []
  );

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);

    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);

    const es = new EventSource(`/api/live?sessionId=${newSessionId}`);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      setIsConnected(true);
      setIsConnecting(false);
      addMessage("assistant", "Connected! How can I help you edit your video?");
    });

    es.addEventListener("text", (event) => {
      const data = JSON.parse(event.data);
      addMessage("assistant", data.text);
    });

    es.addEventListener("tool_call", (event) => {
      const data = JSON.parse(event.data);
      addMessage("tool", `Applied: ${formatToolCall(data.name, data.args)}`, {
        toolName: data.name,
        toolArgs: data.args,
      });
      onToolCall?.(data.name, data.args);
    });

    es.addEventListener("error", (event) => {
      if (event instanceof MessageEvent) {
        const data = JSON.parse(event.data);
        addMessage("assistant", `Error: ${data.message}`);
      }
      setIsConnecting(false);
    });

    es.addEventListener("close", () => {
      setIsConnected(false);
      setIsConnecting(false);
      addMessage("assistant", "Session ended.");
    });

    es.onerror = () => {
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [isConnecting, isConnected, addMessage, onToolCall]);

  const disconnect = useCallback(async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (sessionId) {
      await fetch(`/api/live?sessionId=${sessionId}`, {
        method: "DELETE",
      }).catch(() => {});
    }
    setIsConnected(false);
    setSessionId(null);
  }, [sessionId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !sessionId || !isConnected) return;

    const text = input.trim();
    setInput("");
    addMessage("user", text);

    await fetch("/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, type: "text", text }),
    }).catch(() => {
      addMessage("assistant", "Failed to send message. Please try again.");
    });
  }, [input, sessionId, isConnected, addMessage]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          if (sessionId && base64) {
            addMessage("user", "[Voice message]");
            await fetch("/api/live", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId,
                type: "audio",
                audioData: base64,
                mimeType: "audio/webm",
              }),
            }).catch(() => {
              addMessage(
                "assistant",
                "Failed to send audio. Please try again."
              );
            });
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(250); // Collect chunks every 250ms
      setIsRecording(true);
    } catch {
      addMessage(
        "assistant",
        "Microphone access denied. Please enable microphone permissions."
      );
    }
  }, [isRecording, sessionId, addMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                : "bg-white/30"
            }`}
          />
          <span className="text-sm font-medium text-white/80">
            AI Editor {isConnected ? "Online" : "Offline"}
          </span>
        </div>
        <button
          onClick={isConnected ? disconnect : connect}
          disabled={isConnecting}
          className={`px-3 py-1 text-xs rounded-full transition-all ${
            isConnected
              ? "bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
              : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
          } disabled:opacity-50`}
        >
          {isConnecting ? "Connecting..." : isConnected ? "Disconnect" : "Connect"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-blue-500/20 text-blue-100 border border-blue-500/20"
                  : msg.role === "tool"
                  ? "bg-amber-500/10 text-amber-200 border border-amber-500/20"
                  : "bg-white/5 text-white/90 border border-white/5"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleRecording}
            disabled={!isConnected}
            className={`p-2 rounded-full transition-all ${
              isRecording
                ? "bg-red-500/30 text-red-300 border border-red-500/40 animate-pulse"
                : "bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10 border border-white/10"
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            title={isRecording ? "Stop recording" : "Talk to AI"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected
                ? "Type a message..."
                : "Connect to start chatting"
            }
            disabled={!isConnected}
            className="flex-1 bg-white/5 text-white placeholder-white/30 text-sm px-3 py-2 rounded-xl border border-white/10 outline-none focus:border-white/25 disabled:opacity-30 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !input.trim()}
            className="p-2 rounded-full bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function formatToolCall(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "updateScene":
      return `Updated scene ${(args.sceneIndex as number) + 1}`;
    case "changeStyle": {
      const prop = args.property as string;
      const val = args.value;
      return `Changed ${prop} to ${JSON.stringify(val)}`;
    }
    case "addAsset":
      return `Added ${args.type} asset`;
    case "switchTemplate":
      return `Switched to ${args.templateId} template`;
    case "regenerateMusic":
      return `Regenerating music: "${args.prompt}"`;
    case "toggleVeoFinale":
      return `Veo finale ${args.enabled ? "enabled" : "disabled"}`;
    default:
      return `${name}(${JSON.stringify(args)})`;
  }
}
