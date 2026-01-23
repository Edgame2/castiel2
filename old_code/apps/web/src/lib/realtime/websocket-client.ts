import { env } from "@/lib/env"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

export type MessageType =
  | "enrichment.started"
  | "enrichment.progress"
  | "enrichment.completed"
  | "enrichment.failed"
  | "notification"
  | "presence.update"
  | "shard.updated"
  | "shard.deleted"
  | "conversation.message.added"
  | "conversation.message.edited"
  | "conversation.message.deleted"
  | "conversation.typing.start"
  | "conversation.typing.stop"
  | "conversation.updated"

export interface WebSocketMessage<T = unknown> {
  type: MessageType
  payload: T
  timestamp: number
}

type MessageHandler<T = unknown> = (payload: T) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageHandlers: Map<MessageType, Set<MessageHandler>> = new Map()
  private token: string | null = null
  private isIntentionallyClosed = false

  private tokenProvider: (() => Promise<string | null>) | null = null

  async connect(tokenOrProvider: string | (() => Promise<string | null>)) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
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
        trackTrace("[WebSocket] Failed to fetch token", 3, {
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
      trackTrace("[WebSocket] No token provided", 3, {
        hasTokenProvider: !!this.tokenProvider,
      })
      return
    }

    this.token = token
    this.isIntentionallyClosed = false

    const apiUrl = env.NEXT_PUBLIC_API_BASE_URL
    if (!apiUrl) {
      trackTrace("[WebSocket] API URL not configured", 3)
      return
    }

    const wsUrl = apiUrl.replace(/^http/, "ws")

    try {
      this.ws = new WebSocket(`${wsUrl}/ws?token=${token}`)

      this.ws.onopen = () => {
        trackTrace("[WebSocket] Connected", 1)
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error))
          trackException(errorObj, 3)
          trackTrace("[WebSocket] Failed to parse message", 3, {
            errorMessage: errorObj.message,
            dataPreview: typeof event.data === 'string' ? event.data.substring(0, 100) : 'non-string data',
          })
        }
      }

      this.ws.onerror = (error) => {
        const readyState = this.ws?.readyState;
        const readyStateName = readyState === WebSocket.CONNECTING ? 'CONNECTING' :
                              readyState === WebSocket.OPEN ? 'OPEN' :
                              readyState === WebSocket.CLOSING ? 'CLOSING' :
                              readyState === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN';
        
        // Extract error event properties
        const errorEventDetails: any = {};
        if (error && typeof error === 'object') {
          try {
            errorEventDetails.type = (error as Event).type || 'unknown';
            const wsTarget = (error as Event).target;
            errorEventDetails.target = wsTarget ? {
              readyState: wsTarget instanceof WebSocket 
                ? wsTarget.readyState 
                : 'not WebSocket',
              url: wsTarget instanceof WebSocket 
                ? wsTarget.url 
                : 'not WebSocket',
              protocol: wsTarget instanceof WebSocket 
                ? wsTarget.protocol 
                : 'not WebSocket',
              extensions: wsTarget instanceof WebSocket 
                ? wsTarget.extensions 
                : 'not WebSocket',
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
          readyStateName,
          url: this.ws?.url || 'no url',
          protocol: this.ws?.protocol || 'no protocol',
          extensions: this.ws?.extensions || 'no extensions',
          hasToken: !!token,
          tokenLength: token?.length || 0,
          tokenPreview: token ? `${token.substring(0, 20)}...` : 'no token',
          wsUrl: `${wsUrl}/ws?token=${token ? '***' : 'no token'}`,
          errorEvent: errorEventDetails,
        };
        
        // Track error with structured logging
        trackTrace("[WebSocket] Error", 3, errorDetails)
        
        // Also track as exception if we have error details
        if (error && typeof error === 'object') {
          const errorObj = error instanceof Error ? error : new Error('WebSocket error event')
          trackException(errorObj, 3, errorDetails)
        }
      }

      this.ws.onclose = (event) => {
        const closeDetails = {
          code: event.code,
          reason: event.reason || 'no reason',
          wasClean: event.wasClean,
          readyState: this.ws?.readyState,
          url: this.ws?.url || 'no url',
          isIntentionallyClosed: this.isIntentionallyClosed,
        };
        
        // Determine close code meaning
        let closeCodeMeaning = 'Normal closure'
        if (event.code !== 1000) {
          const codeMeanings: Record<number, string> = {
            1001: 'Going away (server shutdown or browser navigation)',
            1002: 'Protocol error',
            1003: 'Unsupported data',
            1006: 'Abnormal closure (no close frame received)',
            1007: 'Invalid frame payload data',
            1008: 'Policy violation',
            1009: 'Message too big',
            1010: 'Extension negotiation failed',
            1011: 'Internal server error',
            1012: 'Service restart',
            1013: 'Try again later',
            1014: 'Bad gateway',
            1015: 'TLS handshake failure',
          }
          closeCodeMeaning = codeMeanings[event.code] || `Unknown close code: ${event.code}`
        }

        trackTrace("[WebSocket] Disconnected", event.code === 1000 ? 1 : 2, {
          ...closeDetails,
          closeCodeMeaning,
        })

        if (!this.isIntentionallyClosed) {
          trackTrace("[WebSocket] Connection closed unexpectedly, attempting reconnect...", 2, {
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
          })
          this.reconnect()
        } else {
          trackTrace("[WebSocket] Connection closed intentionally", 1)
        }
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("[WebSocket] Connection failed", 3, {
        errorMessage: errorObj.message,
        wsUrl: wsUrl.replace(/token=[^&]+/, 'token=***'),
      })
      this.reconnect()
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      trackTrace("[WebSocket] Max reconnection attempts reached", 3, {
        maxReconnectAttempts: this.maxReconnectAttempts,
      })
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    trackTrace(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 1, {
      delay,
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
    })

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
          trackTrace(`[WebSocket] Handler error for ${message.type}`, 3, {
            messageType: message.type,
            errorMessage: errorObj.message,
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

  send(type: string, payload: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }))
    } else {
      trackTrace("[WebSocket] Cannot send message, not connected", 2, {
        messageType: type,
        readyState: this.ws?.readyState,
      })
    }
  }

  disconnect() {
    this.isIntentionallyClosed = true

    if (this.ws) {
      this.ws.close(1000, "Client disconnect")
      this.ws = null
    }

    this.token = null
    this.reconnectAttempts = 0
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  get readyState(): number | null {
    return this.ws?.readyState ?? null
  }
}

export const wsClient = new WebSocketClient()
