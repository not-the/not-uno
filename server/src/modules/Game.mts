import { io, server } from "../server.js"
import type { UserSocket } from "../types.js"
import LogEntry from "./LogEntry.mjs"
// import { repeat, clamp, shuffle, rotateArr} from "./utils.mjs"

type GameConstructorOptions = {
    roomID: string
    hostSocket: UserSocket
    nameIsUUID: boolean
}

type SocketID = string

/** Game class and methods (Uno) */
export default class Game {
    #hostSocket
    #rejoin_keys = []
    #log = []

    // Types
    config: {
        // Lobby
        public_lobby: boolean
        spectators: boolean
        visible_over_same_network: boolean
        enable_chat: boolean
        reactions: boolean
        max_players: number
    }
    roomID: string
    nameIsUUID: boolean
    host: SocketID
    my_num: number
    state: 'lobby' | 'ingame'
    roomClosed?: boolean
    roomClosedTimestamp?: number
    destroyed?: boolean
    round: number
    turn: number
    players: any[]
    winner?: SocketID
    roomCreatedTimestamp: number

    /** Constructor */
    constructor({ roomID, hostSocket, nameIsUUID }: GameConstructorOptions) {
        // Statistics
        server.stats.total_games++

        // Game Config
        this.config = {
            // Lobby
            public_lobby: false,
            spectators: true,
            visible_over_same_network: true,
            enable_chat: true,
            reactions: true,
            max_players: 4,
        }

        // Room
        this.roomID = roomID
        this.nameIsUUID = nameIsUUID // Will be true unless the UUID was player-chosen
        this.setHost(hostSocket)

        // Player-specific
        this.my_num = 0

        // State
        // this.started = false
        this.state = 'lobby'
        this.round = 1
        this.players = [] // In-play players
        this.winner = undefined

        // Dev tools
        // this.control_everyone = true // Currently does nothing

        // Register game
        this.roomCreatedTimestamp = Date.now()
        server.games[roomID] = this

        // Update
        this.updateClients()

        // Log
        server.log(`🎮 Created game (${this.roomID}) hosted by ${this.#hostSocket.name} (${this.host})`)

        this.log("Created", roomID).amend(true)
    }

    /** Debug log */
    log(id: string, ...args: any[]) {
        // LOGGING DISABLED
        if(process.env.KEEP_LOGS === undefined) return LogEntry

        // Stringify parameters
        const stringifiedParams = args.map(a => {
            if(a?.id !== undefined) return "SOCKET" // Socket object
            if(a === undefined) return "undefined" // Undefined
            return JSON.stringify(a)
        })

        // Log
        const entry = new LogEntry(id, stringifiedParams, this.#log.length)
        this.#log.push(entry)

        return entry
    }

    /** The game log */
    get getLog() {
        return this.#log
    }

    /** Boolean representing whether the game has reached max players */
    get isFull() {
        return (this.playerCount >= this.config.max_players)
    }

    /** Object of all connected users' profiles (socketID:data pairs) */
    get users() {
        const result = {}
        for(const socket of this.clients as UserSocket[]) {
            result[socket.id] = {
                name: socket.name,
                avatar: socket.avatar,
                socketID: socket.id,
                spectating: socket.spectating
            }
        }
        return result
    }

    /** Object of all users' (who are playing) profiles (socketID:data pairs) */
    get usersPlayers() {
        const result = {}
        for(const socket of this.clients) {
            if(socket.spectating) continue
            result[socket.id] = {
                name: socket.name,
                avatar: socket.avatar,
                socketID: socket.id,
                spectating: socket.spectating
            }
        }
        return result
    }

    /** Returns an array of sockets connected to the room */
    get clients(): UserSocket[] {
        return [...io.sockets.adapter.rooms.get(this.roomID) ?? []].map(id => io.sockets.sockets.get(id)) as UserSocket[]
    }

    /** Gives the number of users who are in play (whether or not the game has started). Spectators excluded. */
    get playerCount() {
        return this.clients.filter(socket => !socket.spectating).length
    }

    /** Gives current number of spectators */
    get spectatorCount() {
        return this.clients.filter(socket => socket.spectating).length
    }

    /** Changes the host user
     * @param {*} socket New host's socket object
     * @param {Boolean} updateClients Whether or not to update connected clients
     */
    setHost(socket: UserSocket, updateClients: boolean=false) {
        const logEntry = this.log("setHost", ...Array.from(arguments))

        if(typeof socket !== 'object') throw new Error("Error in Uno.setHost(): socket parameter is invalid")

        this.#hostSocket = socket
        this.host = socket.id

        logEntry.amend(true)
    }

    /** Joins a client to the room
     * @param {Object} socket Socket to join
     * @param {Boolean} spectate Whether they want to spectate
     * @param {String} rejoin_key Key that allows disconnected players to rejoin
     * @returns {Boolean} Returns false if they can't join, true on success
     */
    join(socket, spectate=false, rejoin_key) {
        const logEntry = this.log("join", ...Array.from(arguments))

        if(!socket) {
            const msg = "Uno.join(): Invalid parameter for 'socket'"
            console.warn(msg)
            logEntry.amend(false, msg)
            return
        }

        const roomID = this.roomID

        // Check rejoin key
        let allowRejoin = false
        if(this.state === "ingame" && this.#rejoin_keys[rejoin_key] !== undefined) allowRejoin = true

        // Room exists but is closed
        if(this.roomClosed) {
            socket.emit("join_failed")
            socket.emit("toast", {
                title: "Invite Expired",
                msg: `Game has ended (${roomID})`
            })
            logEntry.amend(false, "Game has ended")
            return false
        }

        // Game exists and is already started
        if(!allowRejoin && this.state !== "lobby") {
            socket.emit("join_failed")
            socket.emit("toast", {
                title: "Whoops",
                msg: `Game has already started (${roomID})`
            })
            logEntry.amend(false, "Game already started")
            return false
        }

        // Room does not allow spectators
        if(!allowRejoin && spectate && !this.config.spectators) {
            socket.emit("join_failed")
            socket.emit("toast", { title:"Room does not allow spectators" })
            logEntry.amend(false, "Room does not allow spectators")
            return false
        }

        // Room is full
        if(!allowRejoin && this.isFull && !spectate) {
            socket.emit("join_failed")
            socket.emit("toast", { title:"Room is full" })
            logEntry.amend(false, "Room is full")
            return
        }

        // Leave all other rooms
        for(const r of socket.rooms) server.games[r]?.leave(socket.id, false)
        
        // Rejoin personal room
        socket.join(socket.id)

        // Join server-side
        socket.join(roomID)
        server.usersRooms[socket.id] = roomID
        socket.spectating = Boolean(spectate)

        // Create new rejoin key
        const preliminary_rejoin_key = crypto.randomUUID()
        socket.rejoin_key = preliminary_rejoin_key

        // Rejoin
        if(allowRejoin) {
            const oldSocketID = this.#rejoin_keys[rejoin_key]
            const playerIndex = this.players.findIndex(p => p.socketID === oldSocketID)

            // Make sure player is valid
            if(playerIndex !== -1 && this.players[playerIndex] !== undefined) {
                // Update player
                this.players[playerIndex].socketID = socket.id

                // Update this.host to player's new socketID
                if(this.host === oldSocketID) this.host = socket.id

                // Clean up
                delete this.players[playerIndex].disconnected
                delete this.#rejoin_keys[rejoin_key]

                // Register new key
                this.#rejoin_keys[preliminary_rejoin_key] = socket.id
            }
        }

        // Emit join event to client
        socket.emit("joined", {
            roomID: roomID,
            rejoin_key: preliminary_rejoin_key
        })

        // Join message
        const joinMessage =
            !spectate ?
                `"${socket.name}" joined!` :
                `"${socket.name}" is spectating`

        if(!rejoin_key || this.state !== "ingame") {
            socket.to(roomID).emit("toast", {
                title: joinMessage
            })
        }

        // Update
        this.updateClients()

        // Return success
        logEntry.amend(true, `${rejoin_key ? `Rejoined - ` : ""}New rejoin_key: ${String(preliminary_rejoin_key)}`)
        return true
    }

    /** Player was disconnected. The host will have an option to remove them from the game. */
    disconnect(socketID: SocketID) {
        const logEntry = this.log("disconnect", ...Array.from(arguments))

        // Not ingame
        if(this.state !== "ingame") {
            this.leave(socketID)
            logEntry.amend(true, "Not ingame")
            return
        }

        const pnum = this.getPnumFromSocketID(socketID)
        if(pnum === -1) {
            logEntry.amend(true, "User wasn't a player (pnum was -1)")
            return
        }
        this.players[pnum].disconnected = true

        // Close if all players are disconnected
        if((this.state === "ingame" && !this.players.some(p => !p.disconnected))) this.close()

        // Update
        this.updateClients()

        logEntry.amend(true)
    }

    /** Player leave game
     * @param {String} socketID Player's socket ID
     * @param {Boolean} sendtoast Whether or not to send out a toast
     */
    leave(socketID: SocketID, sendtoast: boolean = false, reason?: string) {
        const logEntry = this.log("leave", ...Array.from(arguments))

        // Info
        const roomID = this.roomID

        // Get socket
        const socket = io.sockets.sockets.get(socketID) as UserSocket
        if(socket !== undefined) socket.leave(roomID)

        // De-register user as being in room
        const wasSpectator = this.isSpectating(socketID)
        if(!wasSpectator) delete server.usersRooms[socketID] // maybe this should be in the disconnect event? but seems to work fine here

        // Remove player
        if(!wasSpectator) {
            const pnum = this.getPnumFromSocketID(socketID)
            this.removePlayer(pnum, socket, false)
        }
        
        // Tell user they left
        if(socket !== undefined) socket.emit("leave")
        if(sendtoast) socket.emit("toast", {
            title: "Left game",
            msg: `Room ID: "${roomID}"`
        })

        // Tell room someone left
        this.emit("toast", {
            title: `"${socket?.name ?? "User"}" left!`,
            msg: reason
        })

        // Update remaining clients
        this.updateClients()

        logEntry.amend(true)
    }

    /** Adds a new player to the players array and updates clients */
    addPlayer(socketID, rejoin_key) {
        // Register rejoin keys
        this.#rejoin_keys[rejoin_key] = socketID

        // Update
        this.updateClients()
    }

    /** Removes player from this.players and also handles host transfer logic
     * @param {Number} pnum Player index
     * @param {Object} socket (Optional) Player's socket
     * @returns 
     */
    removePlayer(pnum, socket, updateClients=true) {
        const logEntry = this.log("removePlayer", ...Array.from(arguments))

        // Remove player from game
        this.players.splice(pnum, 1)

        // Update
        if(updateClients) this.updateClients()
        logEntry.amend(true)
    }

    /** Kicks a player by their socket ID
     * @param {Object} socket Socket of the player trying to kick (or undefined to bypass this check)
     * @param {String} socketIDToKick Socket ID of the player to kick
     * @param {Boolean} toast Whether or not to send a toast to the kicked player
     * @param {String} msg Description for kick message
     */
    kick(socket, socketIDToKick, toast=true, msg=null) {
        const logEntry = this.log("kick", ...Array.from(arguments))
        if(socket !== undefined && socket.id !== this.host) {
            logEntry.amend(false, "Kicking user is not the host")
            return
        }

        // Toast
        if(toast) io.to(socketIDToKick).emit("toast", { title: "Kicked from game", msg })

        // Leave
        this.leave(socketIDToKick, false, "Kicked from game")
        logEntry.amend(true)
    }

    // setConfigOption(socket, option, value) {
        
    // }

    /** Marks game as closed, automatically gets deleted after 24-48 hours */
    close() {
        const logEntry = this.log("close", ...Array.from(arguments))

        this.roomClosed = true
        this.roomClosedTimestamp = Date.now()
        
        // Make spectators leave
        for(const socket of this.clients) this.leave(socket.id)

        // Log
        server.log(`🎮 Closed game (${this.roomID})`)

        logEntry.amend(true)
    }

    /** Completely destroys game object */
    destroy() {
        const logEntry = this.log("destroy", ...Array.from(arguments))

        this.destroyed = true
        delete server.games[this.roomID] // Delete self
        this.emit("leave")
        server.log(`♻ Cleaned up game (${this.roomID})`)

        logEntry.amend(true)
    }

    /** Request a rematch */
    requestRematch(socketID) {
        const logEntry = this.log("requestRematch", ...Array.from(arguments))

        // Not on win screen
        if(!this.winner) return logEntry.amend(false, "Not on win screen")

        // Invalid player
        const pnum = this.getPnumFromSocketID(socketID)
        if(pnum === -1 || this.players?.[pnum] === undefined) {
            logEntry.amend(false, "Invalid pnum")
            return
        }

        // Set rematch property
        this.players[pnum].wants_rematch = true

        // Update
        this.updateClients()

        logEntry.amend(true)
    }

    /** Returns a Boolean based on if a provided socketID is spectating or not
     * @param {String} socketID Socket ID of the player to test
     * @returns {Boolean} True if user is a spectator
     */
    isSpectating(socketID: SocketID) {
        const socket = io.sockets.sockets.get(socketID) as UserSocket
        if(!socket) return false
        return Boolean(socket.spectating)
    }

    /** Returns the index of a given socket id within the players list
     * @param {String} socketID Socket ID
     * @param {Array} players Players list (optional)
     * @returns {Number}
     */
    getPnumFromSocketID(socketID, players=this.players) {
        return players.findIndex(p => p?.socketID === socketID)
    }

    /** Emits to game's room */
    emit(eventName="gameState", data?: any) {
        io.in(this.roomID).emit(eventName, data)
    }

    /** Sets game state to lobby */
    returnToLobby(socket: UserSocket) {
        const logEntry = this.log("returnToLobby", ...Array.from(arguments))

        // Already in lobby
        if(this.state === "lobby") {
            logEntry.amend(false, "Already in lobby")
            return
        }

        // Host
        if(socket && socket.id !== this.host) {
            const msg = "Only the host can manage the game"
            socket.emit("toast", { msg })
            logEntry.amend(false, msg)
            return
        }

        this.state = "lobby"
        this.updateClients()

        logEntry.amend(true)
    }

    /** Runs the addPlayer() method for each connected user */
    generatePlayers() {
        const sockets = this.clients
        for(let i = 0; i < sockets.length; i++) {
            if(sockets?.[i]?.spectating) continue
            this.addPlayer(sockets[i].id, sockets[i].rejoin_key)
        }
    }

    isValidTurn(pnum) {
        return (
            this.turn === pnum && // Is turn
            this.winner === undefined && // Not in win state
            pnum !== -1 // Not spectating
        )
    }

    /** Chat */
    chat(socket: UserSocket, msg: string) {
        const obj = {
            msg: msg,
            id: crypto.randomUUID(),
            user: {
                name: socket.name,
                avatar: socket.avatar
            },
            socketID: socket.id
        }

        // Log
        // server.log(`🗨  (${this.roomID}) ${socket.name}: ${obj.msg}`)
        // server.log(`🗨  (${this.roomID}) ${socket.name}: [message]`)

        // Broadcast
        io.to(this.roomID).emit("chat_receive", obj)
    }

    /** Player emote */
    emote(socketID: SocketID, msg: string="?", style: any | undefined, socket: UserSocket) {
        // Missing parameters
        if(!socketID) return

        // Reactions disabled
        if(!this.config.reactions && socket) return

        // Emit
        this.emit(`emote_from_${socketID}`, {
            socketID,
            style,
            msg,
            id: crypto.randomUUID()
        })
    }
}
