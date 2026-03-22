import { createLiveSession, type LiveSessionHandle } from "@/lib/gemini-live";

// In-memory session store keyed by session ID
const sessions = new Map<string, LiveSessionHandle>();

// GET /api/live?sessionId=xxx
// Establishes an SSE stream that proxies Gemini Live responses to the client
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return new Response("Missing sessionId", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const handle = await createLiveSession({
          onTextResponse: (text) => {
            sendEvent("text", { text });
          },
          onToolCall: async (name, args) => {
            // Forward tool calls to the client for execution
            sendEvent("tool_call", { name, args });
            // Return acknowledgment — actual execution happens client-side
            return { status: "executed", tool: name };
          },
          onError: (error) => {
            sendEvent("error", { message: error.message });
          },
          onClose: () => {
            sendEvent("close", {});
            sessions.delete(sessionId);
            try {
              controller.close();
            } catch {
              // Already closed
            }
          },
        });

        sessions.set(sessionId, handle);
        sendEvent("connected", { sessionId });
      } catch (err) {
        sendEvent("error", {
          message: err instanceof Error ? err.message : "Failed to connect",
        });
        controller.close();
        return;
      }

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        const handle = sessions.get(sessionId);
        if (handle) {
          handle.close();
          sessions.delete(sessionId);
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// POST /api/live
// Send a message (text or audio) to an active Gemini Live session
export async function POST(request: Request) {
  const body = await request.json();
  const { sessionId, type, text, audioData, mimeType } = body as {
    sessionId: string;
    type: "text" | "audio";
    text?: string;
    audioData?: string;
    mimeType?: string;
  };

  if (!sessionId) {
    return Response.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const handle = sessions.get(sessionId);
  if (!handle) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  if (type === "text" && text) {
    handle.sendText(text);
    return Response.json({ status: "sent" });
  }

  if (type === "audio" && audioData && mimeType) {
    handle.sendAudio(audioData, mimeType);
    return Response.json({ status: "sent" });
  }

  return Response.json({ error: "Invalid message type" }, { status: 400 });
}

// DELETE /api/live?sessionId=xxx
// Close an active session
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return Response.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const handle = sessions.get(sessionId);
  if (handle) {
    handle.close();
    sessions.delete(sessionId);
  }

  return Response.json({ status: "closed" });
}
