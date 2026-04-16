import ip from 'ip'

import { io, server, data } from "../server.ts"
import Uno from "./Uno.mjs"
import { setUser } from './setUser.mjs'

/** Creates a URL-safe base64 encoded UUID */
function generateRoomUUID() {
    // Convert
    let uuid = crypto.randomUUID();
    let result = Buffer.from(uuid.replace(/-/g, ''), 'hex').toString('base64url');

    // Reduce in length (This increases the odds of duplicate UUIDs being produced, but since we're not dealing with sensitive data it's unique enough)
    result = result.substring(0, 9);

    return result;
}

export function getGameByUser(socket) {
    return server.games[server.usersRooms[socket.id]];
}

/** Socket.io on "connection" */
const socketConnection = function(socket) {
    // Stats
    server.stats.total_connections++;

    // Log
    server.log(`\u001b[1;32m➜ \u001b[0m ${socket.name} connected (${socket.id})`);

    // ON READY
    socket.on("ready", () => {
        const profile = {
            name: socket.name,
            avatar: socket.avatar
        }
        if(socket.elevated) profile.elevated = true;

        // Profile
        socket.emit("myProfile", profile);

        // Auto join room
        const autoJoin = socket.handshake?.query?.autoJoin;
        if(typeof autoJoin === 'string' && autoJoin.length > 0) {
            attemptJoin(autoJoin, undefined, socket.handshake?.query?.rejoin_key);
            delete socket.autoJoin;
        }
    });

    // Join
    socket.on("join", ({ roomID, spectate, rejoin_key }) => {
        attemptJoin(roomID, spectate, rejoin_key)
    });

    /** Attempts to join a room, or creates a new one if necessary */
    function attemptJoin(roomID, spectate, rejoin_key) {
        // Type check
        if(roomID !== undefined && typeof roomID !== 'string') return;
        if(spectate !== undefined && typeof spectate !== 'boolean') return;
        if(typeof rejoin_key !== 'string') rejoin_key = null;

        // Client is already in the requested room
        if(socket.rooms.has(roomID) && socket.spectating === spectate) return;

        // Room ID
        let roomIDCopy = structuredClone(roomID);

        // ID undefined, needs random ID
        const nameIsUUID = (!roomIDCopy);
        if(nameIsUUID) roomIDCopy = generateRoomUUID();

        // Replace non-breaking hyphens
        roomIDCopy = roomIDCopy.replaceAll("‑", "-").replaceAll("%E2%80%91", "-");

        // ID is not a string or too long
        const roomLengthMin = 4, roomLengthMax = 32;
        if(
            typeof roomIDCopy !== 'string' ||
            roomIDCopy.length < roomLengthMin ||
            roomIDCopy.length > roomLengthMax
        ) {
            server.log(`Failed trying to join room: User ID ${socket.id}`);
            socket.emit("toast", {
                title: "Error",
                msg: `Failed trying to join room. Must be between ${roomLengthMin} and ${roomLengthMax} characters.`
            });
            return;
        };

        // Check for existing
        /** @type {Uno|Undefined} */
        let game = server.games[roomIDCopy];
        let toastTitle = "Joined game";

        // Create new
        if(game === undefined) {
            game = new Uno({
                roomID: roomIDCopy,
                hostSocket: socket,
                nameIsUUID
            });
            toastTitle = "Created lobby";
        }

        // -- Try joining existing room -- //
        const success = game.join(socket, spectate, rejoin_key);

        // Toast
        if(success && !spectate && (!rejoin_key || game.state !== "ingame")) socket.emit("toast", {
            title: toastTitle
        });

        return success;
    }

    socket.on("leave", () => {
        getGameByUser(socket)?.leave(socket.id, true);
        socket.emit("leave");
    });

    socket.on("action", data => {
        /** @type {Uno} */
        const game = getGameByUser(socket);
        if(game === undefined || data === undefined) return;

        game.performAction(socket, data);
    });
    
    // Set user profile
    socket.on("setUser", data => setUser(socket, data));

    // Start game
    socket.on("start_game", data => {
        /** @type {Uno} */
        const game = getGameByUser(socket);
        if(game === undefined) {
            server.log(`Warning: Game is undefined. User: [${socket.id}]`);
            socket.emit("toast", {
                title: "Error",
                msg: "Game does not exist. Try making another one."
            })
            socket.emit("leave");
            return;
        }
        game.start(socket);
    })

    // Lobby
    socket.on("returnToLobby", () => {
        /** @type {Uno} */
        const game = getGameByUser(socket);
        if(game === undefined) return;
        game.returnToLobby(socket);
    })

    socket.on("update_config", ({ option, value }) => {
        /** @type {Uno} */
        const game = getGameByUser(socket);
        if(game === undefined || typeof option !== 'string') return;

        game.setConfigOption(socket, option, value);
    })

    socket.on("drawCard", () => {
        /** @type {Uno} */
        const game = getGameByUser(socket);
        if(game === undefined) return;
        game.drawCard(socket.id);
    })

    socket.on("playCard", ucid => {
        /** @type {Uno} */
        const game = getGameByUser(socket);
        if(game === undefined) return;
        game.playCard(socket.id, ucid);
    })

    socket.on("endTurn", () => {
        /** @type {Uno} */
        const game = getGameByUser(socket);
        if(game === undefined) return;
        game.endTurn(socket.id);
    })
    
    socket.on("callout", () => {
        /** @type {Uno} */
        const game = getGameByUser(socket);
        if(game === undefined) return;
        game.callout(socket.id);
    })

    socket.on("requestRematch", () => {
        /** @type {Uno} */
        const game = getGameByUser(socket);
        if(game === undefined) return;
        game.requestRematch(socket.id);
    })

    socket.on("kick", (socketIDToKick) => {
        /** @type {Uno} */
        const game = getGameByUser(socket);
        if(game === undefined) return;
        game.kick(socket, socketIDToKick);
    })

    // Emote message
    socket.on("emote", (msg) => {
        /** @type {Uno} */
        const game = getGameByUser(socket);
        if(game === undefined) return;

        // Invalid reaction
        if(!data.reactions.includes(msg)) return;

        // Prevent spam
        const now = Date.now();
        if(now <= socket.last_emote + data.reaction_cooldown) return;
        socket.last_emote = now;

        // Send
        game.emote(socket.id, msg, undefined, socket);
    })

    // Chat message
    socket.on("chat", (msg) => {
        // Invalid message
        if(typeof msg !== 'string' || msg?.length < 1) return;

        // Too long
        if(msg.length > data.max_chat_length) return socket.emit("toast", { title:"Your message was too long" })

        /** @type {Uno} */
        const game = getGameByUser(socket);

        // Invalid
        if(
            game === undefined ||
            !game?.config?.enable_chat || // Chat is turned off
            game?.has_been_public // Game was set to public
        ) return;

        // Ratelimit
        // const ratelimit = 100;
        // if(Date.now() <= (server.users[socket.id]?.last_msg??0) + ratelimit) {
        //     return socket.emit("toast", {
        //         msg: "You are being ratelimited"
        //     })
        // }
        // server.users[socket.id].last_msg = Date.now();

        // Chat
        game.chat(socket, msg);
    });

    // Public lobby list
    socket.on("request_public_lobbies", () => {
        const lobbies =
            Object.values(server.games)
                .filter(game => !game?.roomClosed) // Game has not ended
                .map(game => game.publicClone());

        // Lobby arrays
        const publicLobbies = lobbies.filter(game => {
            return game?.config?.public_lobby === true &&   // Set to public
            game?.nameIsUUID &&                             // Game ID is not picked by user
            game?.state === "lobby"                         // Still in lobby
        });
        // const spectateLobbies = publicLobbies.filter(game => game?.config?.spectate);

        // Local network
        const localNetworkLobbies = lobbies
            .filter(game => {
                if(
                    !game?.config?.visible_over_same_network || // Option disabled
                    game?.config?.public_lobby || // Public instead
                    game.state !== "lobby" // Already started
                ) return false;

                // Get host's address
                const hostAddress = io.sockets.sockets.get(game.host)?.handshake?.address;
                if(hostAddress === undefined) return false;

                // Test if same subnet
                const sameSubnet = ip.subnet(hostAddress, "255.255.255.0").contains(socket?.handshake?.address);

                // Return
                return sameSubnet;
            });

        // Emit
        socket.emit("lobby_list", {
            // Online users
            online_users: io.sockets.server.engine.clientsCount,

            // Lobbies
            publicLobbies,
            localNetworkLobbies,
            // spectateLobbies,
        });
    })

    // Disconnect
    socket.on("disconnect", () => {
        server.log(`\u001b[1;31m← \u001b[0m ${socket.name} disconnected (${socket.id})`);

        getGameByUser(socket)?.disconnect(socket.id);
    });

    // Remove disconnected player
    socket.on("removeDisconnectedPlayer", (pnum) => {
        // Type check
        if(typeof pnum !== 'number') return;

        /** @type {Uno} */
        const game = getGameByUser(socket);
        if(game === undefined) return;

        // Player is connected
        if(!game?.players?.[pnum].disconnected) return;

        // Remove
        game?.removePlayer(pnum);
    })


    // socket.on("custom_deck", raw => {
    //     // Invalid data
    //     if(
    //         typeof raw !== 'object' ||          // Not an object
    //         raw?.cards === undefined ||         // No cards
    //         !Array.isArray(raw?.cards) ||       // cards property not an array
    //         raw?.name === undefined ||          // Name is undefined
    //         typeof raw?.name !== 'string' ||    // Name not a string
    //         raw?.cards?.length > 240            // Too many cards
            
    //         // To add:
    //         // All cards are objects
    //         // All card properties are legal
    //     ) return;

    //     // ID
    //     const id = crypto.randomUUID();
    //     customDecks[id] = raw; // Save temporarily
    //     log(`A custom deck has been submitted [${id}]`);

    //     // Send ID
    //     socket.emit("custom_deck_success", id); 
    // })


    // Debug
    if(socket.elevated && process.env.DEBUG_ACCESS_KEY) {
        server.log(`👑 "${socket.name}" is elevated (${socket.id})`);

        // Server data
        socket.on("debug", () => {
            socket.emit("debug", {
                usersRooms: server.usersRooms,
                games: server.games,
                allusers: server.users
            })
        });

        // All lobbies
        socket.on("debug_request_lobbies", () => {
            const lobbies =
                Object.values(server.games)
                    .map(game => {
                        const clone = game.publicClone(false);
                        clone.log = game.getLog;
                        return clone;
                    });

            // Lists
            const open = lobbies.filter(game => !game.roomClosed);
            const closed = lobbies.filter(game => game.roomClosed);

            // Respond
            socket.emit("debug_request_lobbies", {
                open,
                closed,
                serverLogHistory: server.logHistory
            })
        });
    }
}

export default socketConnection;
