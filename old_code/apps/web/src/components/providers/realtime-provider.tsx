"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { wsClient } from "@/lib/realtime/websocket-client"
import { sseClient } from "@/lib/realtime/sse-client"
import { MessageType } from "@/lib/realtime/websocket-client"
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

type MessageHandler<T = unknown> = (payload: T) => void

interface RealtimeContextType {
  isConnected: boolean
  connectionType: "websocket" | "sse" | "disconnected"
  subscribe: <T = unknown>(type: MessageType, handler: MessageHandler<T>) => void
  unsubscribe: <T = unknown>(type: MessageType, handler: MessageHandler<T>) => void
  send: (type: string, payload: unknown) => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

interface RealtimeProviderProps {
  children: React.ReactNode
  enabled?: boolean
}

export function RealtimeProvider({ children, enabled = true }: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionType, setConnectionType] = useState<"websocket" | "sse" | "disconnected">("disconnected")

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Get auth token from API
    const initConnection = async () => {
      try {
        const response = await fetch('/api/auth/token', {
          credentials: 'include'
        })

        if (!response.ok) {
          trackTrace('[Realtime] Failed to get auth token', 3, {
            status: response.status,
            statusText: response.statusText,
          })
          setConnectionType('disconnected')
          return
        }

        const { token } = await response.json()

        // Try WebSocket first
        const tryWebSocket = () => {
          wsClient.connect(async () => {
            const res = await fetch('/api/auth/token', {
              credentials: 'include'
            })
            if (!res.ok) return null
            const data = await res.json()
            return data.token
          })

          // Check connection after a short delay
          setTimeout(() => {
            if (wsClient.isConnected) {
              setIsConnected(true)
              setConnectionType("websocket")
              trackTrace("[Realtime] Connected via WebSocket", 0)
            } else {
              // Fallback to SSE
              trackTrace("[Realtime] WebSocket failed, falling back to SSE", 1)
              trySSE()
            }
          }, 2000)
        }

        const trySSE = () => {
          sseClient.connect(async () => {
            const res = await fetch('/api/auth/token', {
              credentials: 'include'
            })
            if (!res.ok) return null
            const data = await res.json()
            return data.token
          })

          setTimeout(() => {
            if (sseClient.isConnected) {
              setIsConnected(true)
              setConnectionType("sse")
              trackTrace("[Realtime] Connected via SSE", 0)
            } else {
              setIsConnected(false)
              setConnectionType("disconnected")
              trackTrace("[Realtime] Failed to establish connection", 3)
            }
          }, 2000)
        }

        // Check if WebSocket is supported
        if (typeof WebSocket !== "undefined") {
          tryWebSocket()
        } else {
          trySSE()
        }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('[Realtime] Error initializing connection', 3, {
          errorMessage: errorObj.message,
        })
        setConnectionType('disconnected')
      }
    }

    initConnection()

    return () => {
      wsClient.disconnect()
      sseClient.disconnect()
      setIsConnected(false)
      setConnectionType("disconnected")
    }
  }, [enabled])

  const subscribe = <T = unknown>(type: MessageType, handler: MessageHandler<T>) => {
    if (connectionType === "websocket") {
      wsClient.on(type, handler)
    } else if (connectionType === "sse") {
      sseClient.on(type, handler)
    }
  }

  const unsubscribe = <T = unknown>(type: MessageType, handler: MessageHandler<T>) => {
    if (connectionType === "websocket") {
      wsClient.off(type, handler)
    } else if (connectionType === "sse") {
      sseClient.off(type, handler)
    }
  }

  const send = (type: string, payload: unknown) => {
    if (connectionType === "websocket") {
      wsClient.send(type, payload)
    } else {
      trackTrace("[Realtime] Cannot send messages over SSE (read-only)", 2)
    }
  }

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        connectionType,
        subscribe,
        unsubscribe,
        send
      }}
    >
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error("useRealtime must be used within RealtimeProvider")
  }
  return context
}
