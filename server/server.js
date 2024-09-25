// not uno backend

// Dependencies
const express = require("express");
const app = express();
const fs = require("fs");
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");
const data = require('./data.json');
let word_blacklist;
try { word_blacklist = require('./word_blacklist.json'); }
catch (error) { }

// CORS
const cors = require("cors");
app.use(cors());

// Environment
const isProduction = process.env.NODE_ENV === 'production';
const clientOrigin = isProduction ?
    "https://uno.notkal.com" :  // Production website
    'http://localhost:3000';    // Development


// SSL
var privateKey, certificate;
if(isProduction) {
    try {
        privateKey  = fs.readFileSync(
            '/etc/letsencrypt/live/uno-server1.notkal.com/privkey.pem',
            'utf8'
        );
        certificate = fs.readFileSync(
            '/etc/letsencrypt/live/uno-server1.notkal.com/fullchain.pem',
            'utf8'
        );
    } catch (error) {
        console.warn("SSL keys not found. Error below:");
        console.warn(error);
    }
}


/** Express server instance */
const server = isProduction ?
    https.createServer({
        key: privateKey, cert: certificate
    }, app) : // Production, SSL
    http.createServer(app); // Development



console.log(
`
\x1b[47m\x1b[30m  Starting Not UNO server...  \x1b[0m
> Environment: \x1b[33m${isProduction ? 'production' : 'dev'}\x1b[0m
> Client origin: \x1b[33m${clientOrigin}\x1b[0m
${word_blacklist === undefined ? "> No ./word_blacklist.json provided\n" : ""}`);

/** Socket.io */
const io = new Server(server, {
    cors: {
        // Frontend origin
        origin: clientOrigin,
        methods: ["GET", "POST"]
    }
});

/** Creates a URL-safe base64 encoded UUID */
function getRoomUUID() {
    // Convert
    let uuid = crypto.randomUUID();
    let result = Buffer.from(uuid.replace(/-/g, ''), 'hex').toString('base64url');

    // Reduce in length (This increases the odds of duplicate UUIDs being produced, but since we're not dealing with sensitive data it's unique enough)
    result = result.substring(0, 9);

    return result;
}

/** Returns an array of socket IDs that are in a given room
 * @param {String} roomID 
 * @returns {Array}
 */
function getRoomUsers(roomID) {
    return [...io.sockets.adapter.rooms.get(roomID)??[]];
}

/** Uses the modulus operator to keep a value within amount */
function clamp(value, max) {
    return ((value % max) + max) % max;
}

/** Shuffles are array by modifying it, then returns original array (now shuffled)
 * https://stackoverflow.com/a/2450976/11039898
*/
function shuffle(array) {
    let currentIndex = array.length;
 
    // While there remain elements to shuffle...
    while(currentIndex !== 0) {
        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
 
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
 
    return array;
 }
 
 /** Repeat function
  * https://stackoverflow.com/a/35556907/11039898
  * @param {Function} func 
  * @param {Number} times 
  */
 function repeat(func, times=1) {
     func();
     times && --times && repeat(func, times);
 }


/** Tests whether a move is valid
 * @param {Object} card_a 
 * @param {Object} card_b 
 * @returns {Boolean}
 */
function testCards(card_a, card_b) {
    if(
        card_a.type === card_b.type // Type
        || card_a.color === card_b.color // Color
        || card_a.color === "black"
        || card_b.color === "black"
    ) return true;
    return false;
}

/** Sets the hidden property to true for all cards in an array */
function hideAll(arr, obfuscate) {
    for(let i in arr) {
        // Hidden flag
        if(obfuscate) arr[i] = { hidden:true }; // Strip all other card data
        else arr[i].hidden = true; // Set hidden property but leave card data intact

        // Make wilds black
        if(arr[i].choose_color) arr[i].color = 'black';
    }
    return arr;
}

// Key = socket.id, value = roomID
const usersRooms = {};
const allgames = {};
const allusers = {};



/** Game class */
class Uno {
    constructor({ roomID, host, nameIsUUID }) {
        // Default Config
        this.config = {
            starting_deck: "normal",
            starting_cards: 7,
        
            // allow_continues: false, // Offer to continue game with remaining players after someone wins
            // require_calling_uno: false,
            // call_penalty: 'draw',
            // call_penalty_draw_amount: 2,
        
            infinite_draw: false,
            draw_stacking: "any",

            public_lobby: false,
            enable_chat: true,
            xray: false
        }

        // Data
        this.roomID = roomID;
        this.host = host;
        this.nameIsUUID = nameIsUUID; // Will be true unless the UUID was player-chosen

        // Player-specific
        this.my_num = 0;
            
        // State
        // this.started = false;
        this.state = 'lobby';
        this.winner = undefined;

        this.players = [];

        this.draw_debt = 0;

        // Dev tools
        this.control_everyone = true; // Currently does nothing

        // Register game
        allgames[roomID] = this;

        // Update
        this.updateClients();
    }

    get playersBySocket() { return getRoomUsers(this.roomID); }

    /** Object of users (socketID:data pairs) */
    get users() {
        let users = {};
        for(const PID of this.playersBySocket) users[PID] = allusers[PID];
        return users;
    }

    /** Player leave game
     * @param {*} socket Player's socket
     * @param {Boolean} sendtoast Whether or not to send out a toast
     */
    leave(socket, sendtoast) {
        const roomID = this.roomID;

        // Remove player from game
        this.players.splice(this.getPnumFromSocketID(socket.id), 1);

        // Re-register user as being in room
        delete usersRooms[socket.id];
        socket.leave(roomID);

        // Tell room someone left
        socket.to(roomID).emit("toast", {
            msg: `User [${socket.id}] left!`
        })

        // Tell user they left
        if(sendtoast) socket.emit("toast", {
            title: "Left game",
            msg: `Room ID: "${roomID}"`
        });

        // All players have left
        // console.log('### ', this.players);
        if(this.players.length === 0) {
            // console.log(`Room [${roomID}] is empty, closing game...`);
            return this.close();
        }

        // Transfer ownership to remaining player
        // else if(socket.id === this.host) this.host = this.playersBySocket[0];

        this.updateClients();
    }

    // Marks game as closed, automatically gets deleted after 24-48 hours
    close() {
        this.roomClosed = true;
        this.roomClosedTimestamp = Date.now();
        this.emit("gameState", false);
    }

    // Completely destroys game object
    destroy() {
        this.destroyed = true;
        delete allgames[this.roomID]; // Delete self
        this.emit("gameState", false);
    }

    requestRematch(socketID) {
        const pnum = this.getPnumFromSocketID(socketID);
        if(this.players?.[pnum] === undefined) return;
        this.players[pnum].wants_rematch = true;
        this.updateClients();
    }

    /** Creates a structuredClone of the game, obfuscates the deck, and creates a usersParsed property */
    publicClone() {
        let clone = structuredClone(this);

        // Flatten data
        clone.usersParsed = this.users; // User list
        hideAll(clone.deck, true); // Obfuscate deck

        return clone;
    }

    /** Send game state to clients */
    updateClients() {
        // Clone game
        let clone = this.publicClone();

        /* Tailor data for each user
        Cards that aren't visible to users are stripped of their
        data before being sent to prevent cheating via devtools */
        const sockets = this.playersBySocket;
        for(const socketID of sockets) {
            // Clone game for current player
            let tailoredGame = structuredClone(clone);

            // Get User ID
            tailoredGame.my_num = this.getPnumFromSocketID(socketID, tailoredGame.players);

            // Other player's cards
            if(!this.config.xray) {
                // Hands
                for(const pnum in tailoredGame.players) {
                    if(pnum != tailoredGame.my_num) hideAll(tailoredGame.players[pnum].cards, true);
                }

                // Animation data
                const tailoredAnimTo = tailoredGame?.animation?.toName;
                // console.log('card ', tailoredGame.animation?.card);
                if(
                    tailoredGame.animation?.card !== undefined &&
                    typeof tailoredAnimTo === 'number' &&
                    tailoredAnimTo !== tailoredGame.my_num
                ) {
                    tailoredGame.animation.card = { hidden:true };
                }
            }

            // Emit
            io.to(socketID).emit("gameState", tailoredGame);
        }
        
        // Emit raw data
        // this.emit("gameState", clone);
    }

    setConfigOption(socket, option, value) {
        if(this.host !== socket.id) return socket.emit("Toast", {
            msg: "Must be hosting to change game config"
        })

        if(!this.config.hasOwnProperty(option)) return; // Config property doesn't exist
        if(typeof value !== typeof this.config[option]) return; // New value doesn't match existing type

        // Set
        this.config[option] = value;

        // Special cases
        if(option === "public_lobby" && value === true) {
            this.config.enable_chat = false;
            this.has_been_public = true;
        }

        // Update
        this.updateClients();
    }

    /** Reruns playCard with the player's action of choice */
    performAction(socket, choice) {
        const pnum = this.getPnumFromSocketID(socket.id);
        if(this.turn !== pnum) return; // Not your turn

        // Chose a color
        if(
            this.action === "choose_color" ||
            this.action === "choose_swap" ||
            this.action === "target_draw"
        ) {
            this.playCard(...this.action_params, this.action, choice);
        }
    }

    getPnumFromSocketID(socketID, players=this.players) {
        return players.findIndex(p => p?.socketID === socketID);
    }

    /** Emits to game's room */
    emit(eventName="gameState", data=false) {
        io.in(this.roomID).emit(eventName, data);
    }

    /** Resets the game and starts it (host only)
     * @param {Object} socket Socket of player who made the request
     */
    start(socket) {
        // Host
        if(socket.id !== this.host) {
            socket.emit("toast", { msg: "Only the host can start the game" });
            return;
        };

        // Needs to be either lobby or win screen
        if(this.state !== "lobby" && this.winner === undefined) return;

        // Minimum players
        // if(this.players.length < 2) {
        //     socket.emit("toast", { msg: "Not enough players" });
        //     return;
        // }

        // Setup
        this.deck = structuredClone(data.decks[this.config.starting_deck].cards), // Deck you draw from
        this.pile = []; // Played cards pile

        this.turn = 0;
        this.turn_rotation_value = 0;
        // this.last_turn_rotation_value = 0;
        this.direction = 1; // 1 is clockwise
        this.draw_count = 0; // This turns number of drawn cards
        this.players = [];
        this.winner = undefined;

        this.animation_key = 0;

        hideAll(this.deck, false);
        shuffle(this.deck); // Shuffle

        this.moveCard("deck", "pile", false); // First card
        this.generatePlayers();

        // if(this.players.length < 2) return console.warn("Not enough players");
        this.state = "ingame";

        this.updateClients();
    }

    /** Runs the addPlayer() method for each connected user */
    generatePlayers() {
        let sockets = this.playersBySocket;
        for(let i = 0; i < sockets.length; i++) {
            this.addPlayer(sockets[i]);
        }
    }

    /** Adds a new player to the players array and gives them their cards */
    addPlayer(socketID) {
        this.players.push({
            socketID,
            cards: []
        });

        // Give cards
        const pnum = this.players.length-1;
        repeat(() => this.moveCard("deck", pnum, false, undefined, false), this.config.starting_cards);

        this.updateClients();
    }

    /** Moves a card from one location to another
     * @param {String|Number} fromName 
     * @param {String|Number} toName 
     * @param {Boolean} hidden 
     * @param {Number} fromIndex 
     */
    moveCard(fromName, toName, hidden, fromIndex, runUpdateClients=true) {
        // Get to/from locations
        let from = typeof fromName === 'number' ?
            this.players[fromName].cards : // Player
            this[fromName]; // Location
        let to = typeof toName === 'number' ?
            this.players[toName].cards : // Player
            this[toName]; // Location

        // Take card
        let card = fromIndex === undefined ? from.shift() : from.splice(fromIndex, 1)[0];

        if(card === undefined) return; // Error
        if(hidden !== undefined) card.hidden = hidden; // Unhide
        to.push(card); // Move

        // Empty deck
        if(fromName === 'deck' && this.deck.length === 0) {
            // console.log('Shuffling pile back into deck');

            // Move cards
            this.deck = structuredClone(this.pile.slice(0, -1));
            this.pile = [ this.pile[this.pile.length-1] ];

            // Hide/shuffle
            hideAll(this.deck, false);
            shuffle(this.deck);
        }

        // Animate
        this.animation = { fromName, toName, fromIndex, card };
        this.animation_key++;

        // Update
        if(runUpdateClients) this.updateClients();
    }

    /** Player draw card
     * @param {String} socketID Socket ID of the player who made the request
     * @returns 
     */
    drawCard(socketID) {
        const pnum = this.getPnumFromSocketID(socketID);

        if(!this.isValidTurn(pnum)) return;

        // In debt
        if(this.draw_debt > 0) {
            return this.debtToast(socketID);
        }

        // 1 draw limit
        if(!this.config.infinite_draw && this.draw_count > 0) {
            // Test if last drawn card is valid. If not, end turn
            // const deckTop = this.deck[this.deck.length-1];
            // const playerCards = this.players[pnum].cards;
            // const playerLast = playerCards[playerCards.length-1];
            // console.log('###');
            // console.log(deckTop, playerLast);
            // if(!testCards(deckTop, playerLast)) this.nextTurn();

            // Update state
            // this.updateClients();

            return;
        }

        // Move card
        this.moveCard("deck", pnum, false);
        this.draw_count++;

        this.updateClients();
    }

    debtToast(socketID) {
        let message = "";

        switch (this.config.draw_stacking) {
            case "off":
                message = "Must end turn";
                break;
            case "matching":
                message = `Must stack +${this.piletop.draw} or end turn`;
                break;
            case "any":
                message = "Must stack a draw card or end turn";
                break;
        }

        io.to(socketID).emit("toast", { title: message });
    }

    isValidTurn(pnum) {
        return this.turn === pnum && this.winner === undefined;
    }

    swapCards(pnum1, pnum2) {
        [
            this.players[pnum1].cards,
            this.players[pnum2].cards,
        ] = [
            this.players[pnum2].cards,
            this.players[pnum1].cards,
        ];

        this.updateClients();
    }

    /** Player play card (attempt to put into discard pile)
     * @param {String} socketID 
     * @param {Number} cardID 
     * @param {String} action 
     * @returns {Boolean} If the move was unsuccessful, whether it not be the player's turn or the move is invalid, the method will return false
     */
    playCard(socketID, cardID, actionName, actionChoice, updateClients=true) {
        const pnum = this.getPnumFromSocketID(socketID);

        // Valid
        if(!this.isValidTurn(pnum)) return;

        // Cards
        const playerCard = this.players[pnum].cards[cardID];
        if(playerCard === undefined) {
            // console.warn(`[Player ${pnum}] Card #${cardID} doesn't exist`);
            return false;
        };

        // Test discard pile for valid move
        if(!testCards(playerCard, this.piletop)) {
            // console.warn(`[Player ${pnum}] Invalid card`);
            return false;
        }

        // Card does not deflect debt
        if(this.draw_debt > 0 && !playerCard.draw) {
            return this.debtToast(socketID);
        }

        // Pre-move action prompt
        if(actionChoice === undefined) {
            // Choose color
            if(playerCard.choose_color === true) {
                this.action = "choose_color";
                this.action_params = [socketID, cardID];
                this.updateClients();
                return;
            }

            // Choose swap
            else if(playerCard.choose_swap === true && this.players.length !== 1) {
                this.action = "choose_swap";
                this.action_params = [socketID, cardID];
                this.updateClients();
                return;
            }

            // Target draw
            else if(playerCard.target_draw && this.players.length !== 1) {
                this.action = "target_draw";
                this.action_params = [socketID, cardID];
                this.updateClients();
                return;
            }
        }



        // ----- END MOVE ----- //

        /** Moves the card and ends turn */
        // Play card
        this.moveCard(pnum, "pile", false, cardID);

        // Enact Action
        if(actionChoice !== undefined) {
            // User chose a color
            if(actionName === "choose_color") this.piletop.color = actionChoice;

            // Swap cards
            else if(actionName === "choose_swap") this.swapCards(pnum, actionChoice);

            else if(actionName === "target_draw") this.drawMultipleCards(actionChoice, playerCard.target_draw);
        }

        // End action prompt
        delete this.action;
        delete this.action_params;

        // Prep for next turn
        if(playerCard.reverse) this.direction *= -1;

        // 2 player reverse
        if(playerCard.reverse && this.players.length === 2) {
            this.draw_count = 0;
            if(updateClients) this.updateClients();
            return;
        }

        // Add draw card debt
        if(playerCard.draw) {
            this.draw_debt += playerCard.draw;
        }

        // Next turn
        this.nextTurn(playerCard.skip, playerCard);

        // Update state
        // setGame(modifiedGame);
        if(updateClients) this.updateClients();
    }


    drawMultipleCards(pnum, amount) {
        if(pnum === undefined || amount === undefined) console.warn("drawMultipleCards: undefined parameter(s)");
        repeat(() => this.moveCard("deck", pnum, false, undefined, false), amount);
    }

    get piletop() { return this.pile[this.pile.length-1]; }

    /** Choose to end turn */
    endTurn(socketID) {
        if(this.draw_count === 0 && this.draw_debt === 0) return;

        const pnum = this.getPnumFromSocketID(socketID);
        if(!this.isValidTurn(pnum)) return;

        this.nextTurn();
        this.updateClients();
    }

    /** Start next turn */
    nextTurn(skip=0, playerCard={}) {
        const lastPlayerID = this.turn;
        const turnValue = ((1 + skip) * this.direction);
        this.turn = clamp(
            this.turn + turnValue,
            this.players.length
        );
        // this.last_turn_rotation_value = this.turn_rotation_value;
        this.turn_rotation_value += turnValue;
        this.draw_count = 0;

        // Draw cards
        if(this.draw_debt > 0) {
            if(!playerCard.draw) {
                this.drawMultipleCards(lastPlayerID, this.draw_debt);
                this.draw_debt = 0;
            }
        }

        // Check for win state
        for(const player of this.players) {
            if(player?.cards?.length === 0) {
                this.winner = player.socketID;
                break;
            }
        };

        // Auto end turn if draw stacking is off and you must draw cards
        if(this.config.draw_stacking === "off" && this.draw_debt > 0) this.endTurn(this.players[this.turn].socketID);
    }
}

function arrRandom(arr) {
    return arr[Math.floor(Math.random()*arr.length)]
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


// Listeners
io.on("connection", (socket) => {
    // Set random username/avatar
    setUser(undefined, true);
    
    // Log
    console.log(`Connection: ${allusers[socket.id].name} [${socket.id}]`);

    // Join
    socket.on("join", data => {
        console.log(data);

        let roomID = structuredClone(data);
        let needsRandom = (!roomID);
        if(needsRandom) roomID = getRoomUUID();

        console.log(roomID, needsRandom);

        joinRoom(roomID, needsRandom);
    })

    socket.on("leave", () => {
        getGameByUser()?.leave(socket, true);
        socket.emit("gameState", false);
    });

    socket.on("action", data => {
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

        const existing = allusers?.[socket.id];

        // Ratelimit
        const ratelimit = (existing?.changes??0) > 100 ?
            30000 : // 30 seconds (if user has updated themselves 100+ times)
            500; // 0.5 seconds
        if(
            !bypassRatelimit &&
            existing?.changes >= 5 &&
            Date.now() <= (existing?.last_changed??0) + ratelimit
        ) return socket.emit("toast", {
            title: "Wait before trying again"
        })

        allusers[socket.id] = {
            name: newUser?.name ?? existing?.name ?? "Player",
            avatar: newUser?.avatar ?? existing?.avatar ?? arrRandom(data.avatars),
            socketID: socket.id,
            changes: (existing?.changes??0) + 1,
            last_changed: bypassRatelimit ? 0 : Date.now() // Timestamp
        }
        if(!bypassRatelimit) socket.emit("assignedUserData", allusers[socket.id]);
        // if(!bypassRatelimit) socket.emit("toast", {
        //     title: "Profile updated"
        // })
        getGameByUser()?.updateClients();
    }

    // Join room handler
    function joinRoom(roomID, nameIsUUID) {
        // ID is not a string or too long
        if(typeof roomID !== 'string' || roomID.length < 4 || roomID.length > 32) {
            console.warn(`Failed trying to join room: User ID ${socket.id}`);
            socket.emit("toast", {
                title: "Error",
                msg: `Failed trying to join room. Must be between 4 and 32 characters.`
            });
            return;
        };

        // Check for existing
        let game = allgames[roomID];
        let toastTitle = "Joined game";

        // Create new
        if(game === undefined) {
            game = new Uno({
                roomID,
                host: socket.id,
                nameIsUUID
            });
            toastTitle = "Created lobby";
        }
        else {
            // Room exists but is closed
            if(game.roomClosed) {
                socket.emit("join_failed");
                socket.emit("toast", {
                    title: "Invite Expired",
                    msg: `Game has ended (${roomID})`
                });
                return;
            }

            // Game exists and is already started
            else if(game.state !== "lobby") {
                socket.emit("join_failed");
                socket.emit("toast", {
                    title: "Whoops",
                    msg: `Game has already started (${roomID})`
                });
                return;
            }
        }

        // Leave all other rooms
        for(const r of socket.rooms) allgames[r]?.leave(socket, false);
        
        // Rejoin personal room
        socket.join(socket.id);

        // Join
        usersRooms[socket.id] = roomID;
        socket.join(roomID);
        socket.emit("joined", roomID); // Give client room ID
        // console.log(socket.id, ' is in rooms: ', socket.rooms);

        // Toast
        socket.emit("toast", {
            title: toastTitle
        });

        socket.to(roomID).emit("toast", {
            msg: `User "${allusers[socket.id].name}" joined!\n[${socket.id}]`
        });

        game.updateClients();
    }

    // Start game
    socket.on("start_game", data => {
        const game = getGameByUser();
        if(game === undefined) {
            console.warn(`Warning: Game is undefined. User: [${socket.id}]`);
            socket.emit("toast", {
                title: "Error",
                msg: "Game does not exist. Try making another one."
            })
            socket.emit("gameState", false);
            return;
        }
        game.start(socket);
    })

    socket.on("update_config", ({ option, value }) => {
        const game = getGameByUser();
        if(game === undefined || typeof option !== 'string') return;

        game.setConfigOption(socket, option, value);
    })

    socket.on("drawCard", () => {
        const game = getGameByUser();
        if(game === undefined) return;
        game.drawCard(socket.id);
    })

    socket.on("playCard", cardID => {
        const game = getGameByUser();
        if(game === undefined) return;
        game.playCard(socket.id, cardID);
    })

    socket.on("endTurn", () => {
        const game = getGameByUser();
        if(game === undefined) return;
        game.endTurn(socket.id);
    })

    socket.on("requestRematch", () => {
        const game = getGameByUser();
        if(game === undefined) return;
        game.requestRematch(socket.id);
    })

    // Chat message
    socket.on("chat", (data) => {
        // Invalid message
        if(typeof data.msg !== 'string' || data.msg.length < 1) return;

        // Info
        const roomID = usersRooms[socket.id];
        data.user = allusers[socket.id];
        data.socketID = socket.id;

        const game = getGameByUser();

        if(
            game === undefined ||
            !game?.config?.enable_chat || // Chat is turned off
            game?.has_been_public // Game was set to public
        ) return;

        // Ratelimit
        // const ratelimit = 100;
        // if(Date.now() <= (allusers[socket.id]?.last_msg??0) + ratelimit) {
        //     return socket.emit("toast", {
        //         msg: "You are being ratelimited"
        //     })
        // }
        // allusers[socket.id].last_msg = Date.now();

        // Log
        console.log(`[${roomID}] ${data.user.name}: ${data.msg}`);

        // Broadcast
        io.to(roomID).emit("chat_receive", data);
    });

    // Public lobby list
    socket.on("request_public_lobbies", () => {
        const publicLobbies =
            Object.values(allgames)
                .filter(game => {
                    return game?.config?.public_lobby === true &&   // Set to public
                           game?.state === "lobby" &&               // Still in lobby
                           game?.nameIsUUID &&                      // Game ID is not picked by user
                           !game?.roomClosed                        // Game has not ended
                })
                .map(game => game.publicClone());
        
        // Delay makes it feel like it's doing more work than it is
        setTimeout(() => {
            socket.emit("lobby_list", publicLobbies);
        }, 250);
    })

    // Disconnect
    socket.on("disconnect", () => {
        console.log(`Disconnected: ${socket.id}`);

        getGameByUser()?.leave(socket);

        // De-register
        delete allusers[socket.id];
    });


    // Debug
    if(!isProduction) socket.on("debug", (data) => {
        socket.emit("debug", {
            usersRooms,
            allgames,
            allusers
        })
    });


    // FUNCTIONS
    function getGameByUser() {
        return allgames[usersRooms[socket.id]];
    }
})


// Game cleanup
// const maxGameAge = 30000; // 48 hours
// const cleanupPeriod = 5000; // 12 hours
const maxGameAge = 172800000; // 48 hours
const cleanupPeriod = 43200000; // 12 hours
const cleanupTimer = setInterval(performCleanup, cleanupPeriod);

/** Loops all game object and removes closed games older than maxGameAge */
function performCleanup() {
    for(const [roomID, game] of Object.entries(allgames)) {
        if(!game.roomClosed) continue;
        if(game.roomClosedTimestamp + maxGameAge < Date.now()) game.destroy();
    }
}


// API site confirmation
app.get('/', (req, res) => {
    const responseJSON = {
        online_users:   Object.keys(allusers).length,
        games:          Object.keys(allgames).length,
        games_active:   Object.entries(allgames).filter(i => !i[1].roomClosed).length,
        games_closed:   Object.entries(allgames).filter(i => i[1].roomClosed).length
    };

    if(!isProduction) {
        responseJSON.debug = {
            usersRooms,
            allgames,
            allusers
        }
    }

    res.send(responseJSON);
})

// avatars.json
// app.get('/avatars.json', (req, res) => {
//     const responseJSON = data.avatars;
//     res.send(responseJSON);
// })


// Listen
// const port = 3001;
const port = 443;
server.listen(port, () => {
    console.log(`Listening on port \x1b[36m${port}\x1b[0m\n`);
})
