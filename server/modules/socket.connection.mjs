import { io, server, data, word_blacklist, isProduction } from "../server.mjs"
import { arrRandom } from "./utils.mjs"
import Uno from "./Uno.mjs"

/** Creates a URL-safe base64 encoded UUID */
function generateRoomUUID() {
    // Convert
    let uuid = crypto.randomUUID();
    let result = Buffer.from(uuid.replace(/-/g, ''), 'hex').toString('base64url');

    // Reduce in length (This increases the odds of duplicate UUIDs being produced, but since we're not dealing with sensitive data it's unique enough)
    result = result.substring(0, 9);

    return result;
}

/** Socket.io on "connection" */
const socketConnection = function(socket) {
    // Stats
    server.stats.total_connections++;

    // Log
    server.log(`\u001b[1;32m➜ \u001b[0m ${socket.name} connected (${socket.id})`);

    // ON READY
    socket.on("ready", () => {
        // Profile
        socket.emit("myProfile", {
            name: socket.name,
            avatar: socket.avatar
        });

        // Auto join room
        const autoJoin = socket.handshake?.query?.autoJoin;
        if(typeof autoJoin === 'string' && autoJoin.length > 0) {
            console.log("LES GO");
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
        if(socket.rooms.has(roomID)) return;

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
            console.warn(`Failed trying to join room: User ID ${socket.id}`);
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
        getGameByUser()?.leave(socket.id, true);
        socket.emit("leave");
    });

    socket.on("action", data => {
        /** @type {Uno} */
        const game = getGameByUser();
        if(game === undefined || data === undefined) return;

        game.performAction(socket, data);
    });
    
    // Set user profile
    socket.on("setUser", data => setUser(data));
    function setUser(newUser, bypassRatelimit=false) {
        // Errors
        if(typeof newUser === 'object') {
            // Invalid data types
            if(newUser?.name === '' || typeof newUser?.name !== 'string') return;

            const toastInvalidUsername = {
                title: "Invalid username",
                msg: `Maximum username length is 32 characters.`
            };

            // Length requirement
            if(newUser?.name.length > 32) return socket.emit("toast", toastInvalidUsername);

            // Word blacklist
            if(word_blacklist !== undefined) {
                if(word_blacklist.deny.some((word) => newUser.name.includes(word))) {
                    return socket.emit("toast", toastInvalidUsername);
                }
            }
        }

        // Ratelimit
        const ratelimit = (socket?.name_changes??0) > 100 ?
            15000 : // 15 seconds (if user has updated themselves 100+ times)
            250; // 0.25 seconds
        if(
            !bypassRatelimit &&
            socket?.name_changes >= 5 &&
            Date.now() <= (socket?.name_last_changed??0) + ratelimit
        ) return socket.emit("toast", {
            title: "Wait before trying again"
        })

        // Update user
        Object.assign(socket, {
            name:               newUser?.name   ?? socket?.name   ?? "Player",
            avatar:             newUser?.avatar ?? socket?.avatar ?? arrRandom(data.avatars),
            socketID:           socket.id,
            name_changes:       (socket?.name_changes??0) + 1,
            name_last_changed:  bypassRatelimit ? 0 : Date.now() // Timestamp
        })
        if(!bypassRatelimit) socket.emit("myProfile", {
            name:   socket.name,
            avatar: socket.avatar
        });
        getGameByUser()?.updateClients();
    }


    // Start game
    socket.on("start_game", data => {
        /** @type {Uno} */
        const game = getGameByUser();
        if(game === undefined) {
            console.warn(`Warning: Game is undefined. User: [${socket.id}]`);
            socket.emit("toast", {
                title: "Error",
                msg: "Game does not exist. Try making another one."
            })
            socket.emit("leave");
            return;
        }
        game.start(socket);
    })

    socket.on("returnToLobby", () => {
        /** @type {Uno} */
        const game = getGameByUser();
        if(game === undefined) return;
        game.returnToLobby(socket);
    })

    socket.on("update_config", ({ option, value }) => {
        /** @type {Uno} */
        const game = getGameByUser();
        if(game === undefined || typeof option !== 'string') return;

        game.setConfigOption(socket, option, value);
    })

    socket.on("drawCard", () => {
        /** @type {Uno} */
        const game = getGameByUser();
        if(game === undefined) return;
        game.drawCard(socket.id);
    })

    socket.on("playCard", ucid => {
        /** @type {Uno} */
        const game = getGameByUser();
        if(game === undefined) return;
        game.playCard(socket.id, ucid);
    })

    socket.on("endTurn", () => {
        /** @type {Uno} */
        const game = getGameByUser();
        if(game === undefined) return;
        game.endTurn(socket.id);
    })

    socket.on("requestRematch", () => {
        /** @type {Uno} */
        const game = getGameByUser();
        if(game === undefined) return;
        game.requestRematch(socket.id);
    })

    socket.on("kick", (socketIDToKick) => {
        /** @type {Uno} */
        const game = getGameByUser();
        if(game === undefined) return;
        game.kick(socket, socketIDToKick);
    })

    // Chat message
    socket.on("chat", (data) => {
        // Invalid message
        if(typeof data.msg !== 'string' || data.msg.length < 1) return;

        // Info
        const roomID = server.usersRooms[socket.id];
        data.user = {
            name: socket.name,
            avatar: socket.avatar
        };
        data.socketID = socket.id;

        /** @type {Uno} */
        const game = getGameByUser();

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

        // Log
        server.log(`🗨  (${roomID}) ${data.user.name}: ${data.msg}`);

        // Broadcast
        io.to(roomID).emit("chat_receive", data);
    });

    // Public lobby list
    socket.on("request_public_lobbies", () => {
        const publicLobbies =
            Object.values(server.games)
                .filter(game => {
                    return game?.config?.public_lobby === true &&   // Set to public
                           game?.nameIsUUID &&                      // Game ID is not picked by user
                           !game?.roomClosed                        // Game has not ended
                })
                .map(game => game.publicClone());

        // Lobby arrays
        const joinableLobbies = publicLobbies.filter(game => game?.state === "lobby"); // Still in lobby
        // const spectateLobbies = publicLobbies.filter(game => game?.config?.spectate);
        
        // Delay makes it feel like it's doing more work than it is
        setTimeout(() => {
            socket.emit("lobby_list", {
                online_users: io.sockets.server.engine.clientsCount,
                joinableLobbies,
                // spectateLobbies
            });
        }, 250);
    })

    // Disconnect
    socket.on("disconnect", () => {
        server.log(`\u001b[1;31m← \u001b[0m ${socket.name} disconnected (${socket.id})`);

        getGameByUser()?.disconnect(socket.id);
    });

    // Remove disconnected player
    socket.on("removeDisconnectedPlayer", (pnum) => {
        // Type check
        if(typeof pnum !== 'number') return;

        /** @type {Uno} */
        const game = getGameByUser();
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
    if(!isProduction) socket.on("debug", (data) => {
        socket.emit("debug", {
            usersRooms: server.usersRooms,
            games: server.games,
            allusers: server.users
        })
    });


    // FUNCTIONS
    function getGameByUser() {
        return server.games[server.usersRooms[socket.id]];
    }
}

export default socketConnection;
