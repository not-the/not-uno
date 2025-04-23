import { io, data, server } from "../server.mjs"

import { repeat, clamp, shuffle, rotateArr} from "./utils.mjs";



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

/** Game class and methods (Uno) */
export default class Uno {
    #hostSocket;

    constructor({ roomID, hostSocket, nameIsUUID }) {
        // Statistics
        server.stats.total_games++;

        // Default Config
        this.config = {
            public_lobby: false,
            spectators: true,
            enable_chat: true,
            max_players: 4,

            starting_deck: "classic",
            starting_cards: 7,

            infinite_draw: false,
            draw_stacking: "matching",
            always_play: false,
            xray: false,
            who_goes_first: "first_player",
        
            // allow_continues: false, // Offer to continue game with remaining players after someone wins

            require_call: false,
            call_penalty: "draw",
            call_draw_penalty: 2,
            call_timer: 3 // In seconds
        }

        // Data
        this.roomID = roomID;
        this.nameIsUUID = nameIsUUID; // Will be true unless the UUID was player-chosen
        this.setHost(hostSocket);

        // Player-specific
        this.my_num = 0;
            
        // State
        // this.started = false;
        this.state = 'lobby';
        this.round = 1;
        this.players = []; // In-play players
        this.winner = undefined;
        this.draw_debt = 0;

        // Dev tools
        // this.control_everyone = true; // Currently does nothing

        // Register game
        server.games[roomID] = this;

        // Update
        this.updateClients();

        // Log
        server.log(`🎮 Created game (${this.roomID}) hosted by ${this.#hostSocket.name} (${this.host})`);
    }


    /** Tests whether a move is valid
    * @param {Object} card_a 
    * @param {Object} card_b 
    * @returns {Boolean}
    */
    static testCards(card_a, card_b) {
       if(
           card_a.type === card_b.type // Type
           || card_a.color === card_b.color // Color
           || card_a.color === "black"
           || card_b.color === "black"
       ) return true;
       return false;
   }

    /** Boolean representing whether the game has reached max players */
    get isFull() {
        return (this.playerCount >= this.config.max_players);
    }

    /** Object of all (non-spectating) users' profiles (socketID:data pairs) */
    get users() {
        let result = {};
        for(const socket of this.clients) {
            if(socket.spectating) continue;
            result[socket.id] = {
                name: socket.name,
                avatar: socket.avatar,
                socketID: socket.id
            };
        }
        return result;
    }

    /** Returns an array of socket IDs in the game
     * @param {String} roomID 
     * @returns {Array}
     */
    get clients() { return [...io.sockets.adapter.rooms.get(this.roomID) ?? []].map(id => io.sockets.sockets.get(id)); }

    /** Gives the number of users who are in play (whether or not the game has started). Spectators excluded. */
    get playerCount() {
        return this.clients.filter(socket => !socket.spectating).length;
    }

    /** Gives current number of spectators */
    get spectatorCount() {
        return this.clients.filter(socket => socket.spectating).length;
    }

    /** Changes the host user
     * @param {*} socket New host's socket object
     * @param {Boolean} updateClients Whether or not to update connected clients
     */
    setHost(socket, updateClients=false) {
        if(typeof socket !== 'object') throw new Error("Error in Uno.setHost(): socket parameter is invalid");

        this.#hostSocket = socket;
        this.host = socket.id;
    }

    /** Player leave game
     * @param {*} socket Player's socket
     * @param {Boolean} sendtoast Whether or not to send out a toast
     */
    leave(socketID, sendtoast) {
        // Info
        const roomID = this.roomID;
        const wasSpectator = this.isSpectating(socketID);

        // Get socket
        const socket = io.sockets.sockets.get(socketID);
        if(socket !== undefined) socket.leave(roomID);

        // Remove player from game
        if(!wasSpectator) this.players.splice(this.getPnumFromSocketID(socketID), 1);

        // Mark player as disconnected
        // if(!wasSpectator) {
        //     const p = this.players?.[this.getPnumFromSocketID(socketID)];
        //     if(p !== undefined) p.disconnected = true;
        // }

        // Re-register user as being in room
        delete server.usersRooms[socketID];
        
        // Tell user they left
        if(socket !== undefined) socket.emit("leave");
        if(sendtoast) socket.emit("toast", {
            title: "Left game",
            msg: `Room ID: "${roomID}"`
        });

        // Tell room someone left
        if(!wasSpectator) this.emit("toast", {
            title: `"${socket?.name ?? "User"}" left!`
        })

        // All players have left
        if((this.clients.length - this.spectatorCount) === 0) {
            // server.log(`Room [${roomID}] is empty, closing game...`);
            this.emit("toast", { title: "Game ended" });
            return this.close();
        }

        // Transfer ownership to remaining player
        else if(socketID === this.host) {
            const newHostSocket = this.clients[0];
            this.setHost(newHostSocket);
            this.emit("toast", { title: `"${newHostSocket.name}" is now host` });
        }

        // Update remaining clients
        this.updateClients();
    }

    /** Kicks a player by their socket ID
     * @param {String} socketID 
     */
    kick(socketID, toast=true, msg=undefined) {
        // Toast
        if(toast) io.to(socketID).emit("toast", { title: "Kicked from game", msg });

        // Leave
        this.leave(socketID, false);
    }

    // Marks game as closed, automatically gets deleted after 24-48 hours
    close() {
        this.roomClosed = true;
        this.roomClosedTimestamp = Date.now();
        this.emit("gameState");

        // Log
        server.log(`🎮 Closed game (${this.roomID})`);
    }

    // Completely destroys game object
    destroy() {
        this.destroyed = true;
        delete server.games[this.roomID]; // Delete self
        this.emit("leave");
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
        clone.spectatorCount = this.spectatorCount;
        clone.isFull = this.isFull;

        for(let p of clone.players) delete p.call_timer;

        // Obfuscate deck
        hideAll(clone.deck, true);

        return clone;
    }

    /** Send game state to clients */
    updateClients() {
        // Clone game
        let clone = this.publicClone();

        /* Tailor data for each user
        Cards that aren't visible to users are stripped of their
        data before being sent to prevent cheating via devtools */
        const sockets = this.clients;
        for(const socket of sockets) {
            const socketID = socket.id;

            // Clone game for current player
            let tailoredGame = structuredClone(clone);

            // Get User ID
            tailoredGame.my_num = this.getPnumFromSocketID(socketID, tailoredGame.players);
            tailoredGame.my_spectating = this.isSpectating(socketID);

            // Other player's cards
            if(!this.config.xray && !this.isSpectating(socketID)) {
                // Hands
                for(const pnum in tailoredGame.players) {
                    if(pnum != tailoredGame.my_num) hideAll(tailoredGame.players[pnum].cards, true);
                }

                // Animation data
                const tailoredAnimTo = tailoredGame?.animation?.toName;
                // server.log('card ', tailoredGame.animation?.card);
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
    }

    /** Returns a Boolean based on if a provided socketID is spectating or not
     * @param {String} socketID Socket ID of the player to test
     * @returns {Boolean} True if user is a spectator
     */
    isSpectating(socketID) {
        return Boolean(io.sockets.sockets.get(socketID)?.spectating);
    }

    setConfigOption(socket, option, value) {
        if(this.host !== socket.id) return socket.emit("Toast", {
            msg: "Must be the host to change game config"
        })

        if(!this.config.hasOwnProperty(option)) return; // Config property doesn't exist

        const configData = data.config[option];
        if(typeof value !== configData.type && configData.type !== "dropdown") return; // New value is wrong data type

        // const customDeckException = (option !== "starting_deck" && !value.startsWith("not_uno_deck"));
        const customDeckException = false;
        if(configData.type === "dropdown" && (!configData.dropdown.includes(value) && customDeckException)) return; // Dropdown value is invalid
        if(configData.type === "number" && (value > configData.max || value < configData.min)) return; // Number value is outside min/max range

        // Set
        this.config[option] = value;

        // Special cases
        // Public lobby ON
        if(option === "public_lobby" && value === true) {
            this.config.enable_chat = false;
            this.has_been_public = true;
        }

        // Spectators OFF
        else if(option === "spectators" && value === false) {
            for(const socket of this.clients) {
                const socketID = socket.id;
                if(io.sockets.sockets.get(socketID)?.spectating) {
                    this.kick(socketID, true, "Option to spectate was disabled");
                }
            }
        }

        // Update
        this.updateClients();
    }

    /** Reruns playCard with the player's action of choice */
    performAction(socket, choice) {
        const pnum = this.getPnumFromSocketID(socket.id);
        if(this.turn !== pnum) return; // Not your turn

        // Cancel
        if(choice === null) {
            delete this.action;
            this.updateClients();
            return;
        }

        // Wild color options
        const wildOptions = this.players?.[pnum]?.cards?.[this.action_params?.[1]]?.colors ?? ["red", "blue", "yellow", "green"];

        // Pass action along to playCard method
        if(
            (this.action === "choose_color" && wildOptions.includes(choice)) ||
            this.action === "choose_swap" ||
            this.action === "target_draw"
        ) {
            this.playCard(...this.action_params, this.action, choice);
        }
    }

    /** Returns the index of a given socket id within the players list
     * @param {*} socketID Socket ID
     * @param {*} players Players list (optional)
     * @returns 
     */
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
        this.deck = this.getStartingDeckCards(); // Deck you draw from
        this.pile = []; // Played cards pile

        // Turn
        // Will always be the player number of whoever's turn it is
        let startingPlayerID = 0;
        // Random
        if(this.config.who_goes_first === "random") {
            startingPlayerID = Math.floor(Math.random() * this.playerCount);
        }
        // Last winner
        else if(this.config.who_goes_first === "winner") {
            const lastWinnerID = this.getPnumFromSocketID(this.winner);
            startingPlayerID = (lastWinnerID === -1 ? 0 : lastWinnerID) ?? 0;
        }

        this.turn = startingPlayerID;

        this.turn_absolute = 0; // Incremements by one each turn
        this.turn_rotation_value = 0; // Increases and decreases depending on rotation but is not clamped to player ID
        // this.last_turn_rotation_value = 0;
        this.direction = 1; // 1 is clockwise
        this.draw_count = 0; // This turns number of drawn cards
        this.players = [];
        this.winner = undefined;
        this.draw_debt = 0;
        delete this.action;
        delete this.action_params;

        this.animation_key = 0;

        hideAll(this.deck, false);
        shuffle(this.deck); // Shuffle

        this.moveCard("deck", "pile", false); // First card
        this.generatePlayers();

        this.state = "ingame";
        this.round++;

        this.updateClients();
    }

    /** Gets the starting deck and returns it */
    getStartingDeckCards() {
        // Get deck
        const deckCards = data.decks?.[this.config.starting_deck]?.cards
        deckCards.forEach((card) => card.ucid = crypto.randomUUID()); // Give cards Unique IDs

        // Return
        return structuredClone(deckCards);
    }

    /** Sets game state to lobby */
    returnToLobby(socket) {
        // Host
        if(socket.id !== this.host) {
            socket.emit("toast", { msg: "Only the host can manage the game" });
            return;
        };

        this.state = "lobby";
        this.updateClients();
    }

    /** Runs the addPlayer() method for each connected user */
    generatePlayers() {
        const sockets = this.clients;
        for(let i = 0; i < sockets.length; i++) {
            if(sockets?.[i]?.spectating) continue;
            this.addPlayer(sockets[i].id);
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
        this.replenishDeck();

        // Animate
        this.animation = { fromName, toName, fromIndex, card };
        this.animation_key++;
        // maybe make the above code use UCIDs too so there's no need for redundant code
        // const animFrom = typeof fromName === 'number' ?
        //     this.players[fromName].cards[fromIndex].ucid : // Player
        //     fromName; // Location
        // const animTo = typeof toName === 'number' ?
        //     this.players[toName].cards[this.players[toName].cards.length-1].ucid : // Player
        //     toName; // Location
        // this.animation = { from:animFrom, to:animTo };
        // this.animation_key++;

        // Update
        if(runUpdateClients) this.updateClients();
    }

    /** Takes cards from underneath the pile and shuffles them back into the deck */
    replenishDeck() {
        if(this.deck.length !== 0) return;

        // Move cards
        this.deck = structuredClone(this.pile.slice(0, -1));
        this.pile = [ this.pile[this.pile.length-1] ];

        // Hide/shuffle
        hideAll(this.deck, false);
        shuffle(this.deck);
    }

    /** Player draw card
     * @param {String} socketID Socket ID of the player who made the request
     * @returns 
     */
    drawCard(socketID) {
        const pnum = this.getPnumFromSocketID(socketID);

        // Not your turn
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
            // server.log('###');
            // server.log(deckTop, playerLast);
            // if(!Uno.testCards(deckTop, playerLast)) this.nextTurn();

            // Update state
            // this.updateClients();

            return;
        }

        // Deck is empty
        if(this.deck.length === 0) return;

        // Move card
        const ucid = this.deck[0].ucid;
        this.moveCard("deck", pnum, false);
        this.draw_count++;

        // Update client
        this.updateClients();
        io.to(socketID).emit("scroll_cards", ucid);
    }

    /** Sends toast to a given socket explaining draw stacking */
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
        return (
            this.turn === pnum && // Is turn
            this.winner === undefined && // Not in win state
            pnum !== -1 // Not spectating
        );
    }

    /** Swaps 2 player's hands
     * @param {Number} pnum1 First player's ID
     * @param {Number} pnum2 Second player's ID
     */
    swapHands(pnum1, pnum2) {
        [
            this.players[pnum1].cards,
            this.players[pnum2].cards,
        ] = [
            this.players[pnum2].cards,
            this.players[pnum1].cards,
        ];
    }

    /** Every player passes their hands along in the current rotation direction */
    passHands() {
        const direction = this.direction;
        const hands = this.players.map(p => p.cards);
        rotateArr(hands);
        for(const i in this.players) this.players[i].cards = hands[i];
    }

    /** Player play card (attempt to put into discard pile)
     * @param {String} socketID 
     * @param {Number} cardID 
     * @param {String} action 
     * @returns {Boolean} If the move was unsuccessful, whether it not be the player's turn or the move is invalid, the method will return false
     */
    playCard(socketID, ucid, actionName, actionChoice, updateClients=true) {
        const pnum = this.getPnumFromSocketID(socketID);

        // Valid
        if(!this.isValidTurn(pnum)) return;

        // Cards
        const playerCardIndex = this.players[pnum].cards.findIndex(card => card.ucid === ucid);
        const playerCard = this.players[pnum].cards[playerCardIndex];
        if(playerCard === undefined) {
            // console.warn(`[Player ${pnum}] Card #${cardID} doesn't exist`);
            return false;
        };

        // Card does not deflect debt
        const needsMatching = this.config.draw_stacking === "matching";
        const isMatching = playerCard.draw === this.piletop.draw;
        if(this.draw_debt > 0 && (!playerCard.draw || (needsMatching && !isMatching))) {
            return this.debtToast(socketID);
        }

        // Test discard pile for valid move
        if(!Uno.testCards(playerCard, this.piletop)) {
            // console.warn(`[Player ${pnum}] Invalid card`);
            return false;
        }

        // Pre-move action prompt
        if(actionChoice === undefined) {
            // Choose color
            if(playerCard.choose_color === true) {
                this.action = "choose_color";
                this.action_params = [socketID, ucid];
                this.updateClients();
                return;
            }

            // Choose swap
            else if(playerCard.choose_swap === true && this.players.length !== 1) {
                this.action = "choose_swap";
                this.action_params = [socketID, ucid];
                this.updateClients();
                return;
            }

            // Target draw
            else if(playerCard.target_draw && this.players.length !== 1) {
                this.action = "target_draw";
                this.action_params = [socketID, ucid];
                this.updateClients();
                return;
            }
        }



        // ----- END MOVE ----- //

        /** Moves the card and ends turn */
        // Play card
        this.moveCard(pnum, "pile", false, playerCardIndex);

        // Enact Action
        if(actionChoice !== undefined) {
            // User chose a color
            if(actionName === "choose_color") this.piletop.color = actionChoice;

            // Swap cards
            else if(actionName === "choose_swap") this.swapHands(pnum, actionChoice);

            else if(actionName === "target_draw") this.drawMultipleCards(actionChoice, playerCard.target_draw);
        }

        if(this.piletop.pass_hands) this.passHands();

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

    /** Player action - Choose to end turn */
    endTurn(socketID) {
        if(this.draw_count === 0 && this.draw_debt === 0) return;

        const pnum = this.getPnumFromSocketID(socketID);
        if(!this.isValidTurn(pnum)) return;

        // End turn, unless drawing with "Always Play" enabled
        const continueturn = (this.config.always_play && this.draw_debt !== 0);
        const didDrawCards = this.nextTurn(undefined, undefined, continueturn);

        // Update clients
        this.updateClients();
        if(didDrawCards) io.to(socketID).emit("scroll_cards");
    }

    /** Starts next turn
     * @param {Number} skip Number of players to skip
     * @param {Object} playerCard 
     * @param {Boolean} keepTurn Does not end current player's turn but still enacts draw cards, etc
     */
    nextTurn(skip=0, playerCard={}, keepTurn) {
        const lastPlayerID = this.turn;
        const turnValue = ((1 + skip) * this.direction);

        let didDrawCards = false;

        // Update turn
        if(!keepTurn) {
            this.turn = clamp(
                this.turn + turnValue,
                this.players.length
            );
            this.turn_absolute++;
            // this.last_turn_rotation_value = this.turn_rotation_value;
            this.turn_rotation_value += turnValue;
            this.draw_count = 0;
        }

        // Draw cards
        if(this.draw_debt > 0) {
            if(!playerCard.draw) {
                this.drawMultipleCards(lastPlayerID, this.draw_debt);
                this.draw_debt = 0;
                didDrawCards = true;
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

        // Check if awaiting callout
        else if(lastPlayerID !== turnValue) {

            // server.log(lastPlayerID, turnValue);

            const lastPlayer = this.players?.[lastPlayerID];
            if(lastPlayer?.cards?.length === 1) {

                const round = structuredClone(this.round);
                const timerMS = this.config.call_timer * 1000;
                lastPlayer.awaiting_call = true;
                setTimeout(() => {
                    // Clear
                    delete lastPlayer.awaiting_call;

                    // server.log(round, this.round);

                    // Invalid
                    if(
                        !this.config.require_call ||            // Not required
                        this.config.call_draw_penalty === 0 ||  // Penalty is 0
                        this.winner !== undefined ||            // Win screen
                        round !== this.round                    // Even was from previous round
                    ) return;

                    // Penalty
                    this.drawMultipleCards(lastPlayerID, this.config.call_draw_penalty);
                    this.emit("toast", { title:`A player failed to call "last card" in time` });
                        this.updateClients();
                }, timerMS);
            }
        }

        // Did draw cards, return true
        if(didDrawCards) return true;
    }
}