import { env } from "@/lib/env"
import { MessageType, WebSocketMessage } from "./websocket-client"
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

type MessageHandler<T = unknown> = (payload: T) => void

class SSEClient {
  private eventSource: EventSource | null = null
  private messageHandlers: Map<MessageType, Set<MessageHandler>> = new Map()
  private token: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isIntentionallyClosed = false

  private tokenProvider: (() => Promise<string | null>) | null = null

  async connect(tokenOrProvider: string | (() => Promise<string | null>)) {
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      return // Already connected
    }

    let token: string | null = null

    if (typeof tokenOrProvider === 'function') {
      this.tokenProvider = tokenOrProvider
      try {
        token = await this.tokenProvider()
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace("[SSE] Failed to fetch token", 3, {
          errorMessage: errorObj.message,
        })
        this.reconnect()
        return
      }
    } else {
      this.token = tokenOrProvider
      token = tokenOrProvider
    }

    if (!token) {
      trackException(new Error("[SSE] No token provided"), 3)
      return
    }

    this.token = token
    this.isIntentionallyClosed = false

    const apiUrl = env.NEXT_PUBLIC_API_BASE_URL
    if (!apiUrl) {
      trackException(new Error("[SSE] API URL not configured"), 3)
      return
    }

    try {
      // EventSource doesn't support custom headers, so we pass token as query param
      const sseUrl = `${apiUrl}/sse?token=${token}`;
      trackTrace("[SSE] Connecting", 0, {
        url: sseUrl.replace(/token=[^&]+/, 'token=***'),
      })
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        trackTrace("[SSE] Connected successfully", 0)
        this.reconnectAttempts = 0;
      }

      this.eventSource.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error))
          trackException(errorObj, 3)
          trackTrace("[SSE] Failed to parse message", 3, {
            errorMessage: errorObj.message,
          })
        }
      }

      // Handle named events (e.g., conversation events)
      // The backend sends events with `event: ${eventType}`, so we need to listen for specific event types
      const conversationEventTypes: MessageType[] = [
        'conversation.message.added',
        'conversation.message.edited',
        'conversation.message.deleted',
        'conversation.typing.start',
        'conversation.typing.stop',
        'conversation.updated',
      ]

      conversationEventTypes.forEach((eventType) => {
        this.eventSource?.addEventListener(eventType, (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data)
            // The backend sends: { type: eventType, payload: ... }
            // We need to extract the payload and call handlers
            const message: WebSocketMessage = {
              type: data.type || eventType,
              payload: data.payload || data,
              timestamp: data.timestamp || Date.now(),
            }
            this.handleMessage(message)
          } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace(`[SSE] Failed to parse ${eventType} event`, 3, {
              errorMessage: errorObj.message,
              eventType,
            })
          }
        })
      })

      this.eventSource.onerror = (error) => {
        const readyState = this.eventSource?.readyState;
        
        // Extract error event properties
        const errorEventDetails: any = {};
        if (error && typeof error === 'object') {
          try {
            errorEventDetails.type = (error as Event).type || 'unknown';
            const target = (error as Event).target;
            errorEventDetails.target = target ? {
              readyState: target instanceof EventSource 
                ? target.readyState
                : 'not EventSource',
              url: target instanceof EventSource 
                ? target.url
                : 'not EventSource',
            } : 'no target';
            errorEventDetails.timeStamp = (error as Event).timeStamp || 'no timestamp';
            errorEventDetails.bubbles = (error as Event).bubbles ?? 'unknown';
            errorEventDetails.cancelable = (error as Event).cancelable ?? 'unknown';
          } catch (e) {
            errorEventDetails.extractionError = String(e);
          }
        } else {
          errorEventDetails.errorValue = String(error);
        }
        
        const errorDetails = {
          readyState,
          readyStateName: readyState === EventSource.CONNECTING ? 'CONNECTING' : 
                         readyState === EventSource.OPEN ? 'OPEN' : 
                         readyState === EventSource.CLOSED ? 'CLOSED' : 'UNKNOWN',
          url: this.eventSource?.url || 'no url',
          hasToken: !!token,
          tokenLength: token?.length || 0,
          tokenPreview: token ? `${token.substring(0, 20)}...` : 'no token',
          apiUrl,
          errorEvent: errorEventDetails,
        };
        
        trackTrace("[SSE] Error", 3, errorDetails)

        // EventSource doesn't provide HTTP status codes, but we can infer from readyState
        // If it's CLOSED immediately, it's likely a 401/403/404/500 error
        if (readyState === EventSource.CLOSED) {
          if (!this.isIntentionallyClosed) {
            trackTrace("[SSE] Connection closed unexpectedly. Attempting reconnect", 2, {
              possibleCauses: ['Invalid or expired token (401)', 'Route not found (404)', 'Server error (500)', 'CORS issue'],
            })
            this.reconnect();
          } else {
            trackTrace("[SSE] Connection closed intentionally", 1)
          }
        } else if (readyState === EventSource.CONNECTING) {
          trackTrace("[SSE] Still connecting...", 1)
        } else {
          trackTrace("[SSE] Connection in unknown state", 2, { readyState })
        }
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("[SSE] Connection failed", 3, {
        errorMessage: errorObj.message,
      })
      this.reconnect()
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      trackException(new Error("[SSE] Max reconnection attempts reached"), 3)
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    trackTrace(`[SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 1)

    setTimeout(() => {
      if (this.tokenProvider) {
        this.connect(this.tokenProvider)
      } else if (this.token) {
        this.connect(this.token)
      }
    }, delay)
  }

  private handleMessage(message: WebSocketMessage) {
    const handlers = this.messageHandlers.get(message.type)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message.payload)
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error))
          trackException(errorObj, 3)
          trackTrace(`[SSE] Handler error for ${message.type}`, 3, {
            errorMessage: errorObj.message,
            messageType: message.type,
          })
        }
      })
    }
  }

  on<T = unknown>(type: MessageType, handler: MessageHandler<T>) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set())
    }
    this.messageHandlers.get(type)!.add(handler as MessageHandler)
  }

  off<T = unknown>(type: MessageType, handler: MessageHandler<T>) {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      handlers.delete(handler as MessageHandler)
    }
  }

  disconnect() {
    this.isIntentionallyClosed = true

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    this.token = null
    this.reconnectAttempts = 0
  }

  get isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN
  }

  get readyState(): number | null {
    return this.eventSource?.readyState ?? null
  }
}

export const sseClient = new SSEClient()
