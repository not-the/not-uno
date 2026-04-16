import type { Socket } from "socket.io"

export interface UserSocket extends Socket {
    name: string
    avatar: string
    spectating: boolean
    elevated?: boolean
    rejoin_key?: string
}

export type Game = any

/** Primary server object & helper methods */
export type NotUnoServer = {
    usersRooms: Record<string, string>
    games: Record<string, Game>
    stats: {
        startup_time: number
        total_connections: number
        total_games: number
        uptime_ms: number
        getUptime(): string
    }
    
    /** Console logging shorthand w/ fancy formatting and timestamps */
    log(message: string, includeTimestamp?: boolean): void
    logHistory: any[]

    maxGameAge: number
    cleanupPeriod: number

    /** Loops all game object and removes closed games older than maxGameAge */
    performCleanup(): void

    /** Sends a message to a Discord webhook, assuming one is provided */
    webhook(msg: string): void
}

