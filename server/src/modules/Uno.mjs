import Game from "./Game.mjs";
import { io, data } from "../server.mjs"
import { repeat, clamp, shuffle, rotateArr} from "./utils.mjs";
import LogEntry from "./LogEntry.mjs";


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

/** Uno game class and methods. Extends Game */
export default class Uno extends Game {
    // Protected properties
    _name = 'uno'

    // Private properties
    #calloutID = 0;

    constructor(args) {
        // Game constructor
        super(args)

        // Default Config
        this.config = {
            ...this.config,

            starting_deck: "classic",
            starting_cards: 7,
            who_goes_first: "winner",

            draw_stacking: "matching",
            infinite_draw: false,
            always_play: false,
            xray: false,
            // jump_in: false,
        
            // allow_continues: false, // Offer to continue game with remaining players after someone wins

            require_call: false,
            call_timer: 3, // In seconds
            call_penalty: "draw",
            call_draw_penalty: 2
        }

        // State
        this.draw_debt = 0;
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

   /** Tests whether two cards have matching type AND color
    * @param {Object} card_a 
    * @param {Object} card_b 
    * @returns {Boolean}
    */
//    static areCardsSame(card_a, card_b) {
//         if(
//             card_a.type === card_b.type &&
//             card_a.color === card_b.color
//         ) return true;
//         return false;
//    }

    

    /** Creates a structuredClone of the game, obfuscates the deck, and creates a usersParsed property */
    publicClone(hideCards=true) {
        let clone = structuredClone(this);

        // Flatten data
        clone.usersParsed = this.users; // User list
        clone.usersPlayers = this.usersPlayers; // User players
        clone.playerCount = this.playerCount;
        clone.spectatorCount = this.spectatorCount;
        clone.isFull = this.isFull;

        // Obfuscate deck
        if(hideCards) hideAll(clone.deck, true);

        return clone;
    }

    setConfigOption(socket, option, value) {
        const logEntry = this.log("setConfigOption", ...Array.from(arguments));

        // Not the host
        if(this.host !== socket.id) {
            const msg = "Must be the host to change game config";
            socket.emit("Toast", { msg })
            logEntry.amend(false, msg);
            return;
        }

        // Config property doesn't exist
        if(!this.config.hasOwnProperty(option)) {
            logEntry.amend(false, "Config property doesn't exist");
            return;
        }

        // Get option
        const configData = data.config[option];

        // New value is wrong data type
        if(typeof value !== configData.type && configData.type !== "dropdown") {
            logEntry.amend(false, "New value is wrong data type");
            return;
        } 

        // const customDeckException = (option !== "starting_deck" && !value.startsWith("not_uno_deck"));
        const customDeckException = false;
        // Dropdown value is invalid
        if(configData.type === "dropdown" && (!configData.dropdown.includes(value) && customDeckException)) {
            logEntry.amend(false, "Dropdown value is invalid");
            return;
        }

        // Number value is outside min/max range
        if(configData.type === "number" && (value > configData.max || value < configData.min)) {
            logEntry.amend(false, "Number value is outside min/max range");
            return;
        }

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
                    this.kick(undefined, socketID, true, "Option to spectate was disabled");
                }
            }
        }

        // Update
        this.updateClients();

        logEntry.amend(true);
    }

    /** Reruns playCard with the player's action of choice */
    performAction(socket, choice) {
        const logEntry = this.log("performAction", ...Array.from(arguments));

        const pnum = this.getPnumFromSocketID(socket.id);

        // Not your turn or invalid player
        if(pnum === -1 || this.turn !== pnum) {
            logEntry.amend(false, "Not your turn or invalid player");
            return;
        } 

        // Cancel
        if(choice === null) {
            delete this.action;
            this.updateClients();
            logEntry.amend(true, "Action cancelled by player");
            return;
        }

        // Wild color options
        const ucid = this.action_params?.[1];
        const card = this.players?.[pnum]?.cards?.find?.(c => c.ucid === ucid);
        const wildOptions = card?.colors ?? ["red", "blue", "yellow", "green"];

        // Pass action along to playCard method
        if(
            (this.action === "choose_color" && wildOptions.includes(choice)) ||
            this.action === "choose_swap" ||
            this.action === "target_draw"
        ) {
            this.playCard(...this.action_params, this.action, choice);
        }

        logEntry.amend(true, "Action performed");
    }

    /** Resets the game and starts it (host only)
     * @param {Object} socket Socket of player who made the request
     */
    start(socket) {
        const logEntry = this.log("start", ...Array.from(arguments));

        // Host
        if(socket.id !== this.host) {
            const msg = "Only the host can start the game";
            socket.emit("toast", { msg });
            logEntry.amend(false, msg);
            return;
        };

        // Needs to be either lobby or win screen
        if(this.state !== "lobby" && this.winner === undefined) {
            logEntry.amend(false, "Needs to be either lobby or win screen");
            return;
        }

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

        // Game state
        this.state = "ingame";

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

        // Increment round
        this.round++;

        hideAll(this.deck, false);
        shuffle(this.deck); // Shuffle

        this.moveCard("deck", "pile", false); // First card

        // Create players and deal cards
        this.generatePlayers();

        // Update
        this.updateClients();

        logEntry.amend(true);
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

    /** Gets the starting deck and returns it */
    getStartingDeckCards() {
        // Get deck
        const deckCards = data.decks?.[this.config.starting_deck]?.cards
        deckCards.forEach((card) => card.ucid = crypto.randomUUID()); // Give cards Unique IDs

        // Return
        return structuredClone(deckCards);
    }

    /** Adds a new player to the players array and gives them their cards */
    addPlayer(socketID, rejoin_key) {
        // Push new player object
        this.players.push({
            socketID,
            cards: []
        });

        // Give cards
        const pnum = this.players.length-1;
        repeat(() => this.moveCard("deck", pnum, false, undefined, false), this.config.starting_cards);

        // Super
        super.addPlayer(...arguments)
    }

    removePlayer(pnum, socket, updateClients) {
        // Take player's cards and shuffle them back into the deck
        if(this.state === "ingame" && Array.isArray(this.deck)) {
            this.deck = [...this.deck, ...this.players?.[pnum]?.cards??[]];
            hideAll(this.deck, false);
            shuffle(this.deck);
        }

        // All players have left
        if((this.clients.length - this.spectatorCount) === 0) {
            this.emit("toast", { title: "Game ended" });
            // logEntry.amend(undefined, "Game ended");
            return this.close();
        }

        // Transfer ownership to first remaining player
        else if(!this.clients.some(c => c.id === this.host)) {
            const newHostSocket = this.clients[0];
            this.setHost(newHostSocket);
            this.emit("toast", { title: `"${newHostSocket.name}" is now host` });
        }

        // It was that player's turn
        if(this.turn === pnum) {
            this.nextTurn(-1);
        }

        super.removePlayer(pnum, socket, updateClients)
    }

    /** Moves a card from one location to another
     * @param {String|Number} fromName 
     * @param {String|Number} toName 
     * @param {Boolean} hidden 
     * @param {Number} fromIndex 
     */
    moveCard(fromName, toName, hidden, fromIndex, runUpdateClients=true) {
        const logEntry = this.log("moveCard", ...Array.from(arguments));

        // Not ingame
        if(this.state !== "ingame") {
            logEntry.amend(false, "Not ingame");
            return;
        }

        // Get to/from locations
        let from = typeof fromName === 'number' ?
            this.players[fromName]?.cards : // Player
            this[fromName]; // Location
        let to = typeof toName === 'number' ?
            this.players[toName]?.cards : // Player
            this[toName]; // Location

        // Invalid location
        if(from === undefined || to === undefined) {
            logEntry.amend(false, `${from === undefined ? "from was undefined" : ""}, ${to === undefined ? "to was undefined" : ""}`);
            return;
        }

        // Take card
        let card = fromIndex === undefined ? from.shift() : from.splice(fromIndex, 1)[0];

        // Error
        if(card === undefined) {
            logEntry.amend(false, "card is undefined");
            return;
        }

        if(hidden !== undefined) card.hidden = hidden; // Unhide
        to.push(card); // Move

        // Empty deck
        if(this.deck.length === 0) this.replenishDeck();

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

        logEntry.amend(true);
    }

    /** Takes cards from underneath the pile and shuffles them back into the deck */
    replenishDeck() {        
        const logEntry = this.log("replenishDeck", ...Array.from(arguments));

        // Move cards
        this.deck = structuredClone(this.pile.slice(0, -1));
        this.pile = [ this.pile[this.pile.length-1] ];

        // Hide/shuffle
        hideAll(this.deck, false);
        shuffle(this.deck);

        logEntry.amend(true);
    }

    /** Player draw card
     * @param {String} socketID Socket ID of the player who made the request
     * @returns 
     */
    drawCard(socketID) {
        const logEntry = this.log("drawCard", ...Array.from(arguments));

        // Not ingame
        if(this.state !== "ingame") {
            logEntry.amend(false, "Not ingame");
            return;
        }

        // Player number
        const pnum = this.getPnumFromSocketID(socketID);

        // Not your turn
        if(!this.isValidTurn(pnum)) {
            logEntry.amend(false, "Not your turn");
            return;
        }

        // In debt
        if(this.draw_debt > 0) {
            logEntry.amend(undefined, `In debt (${this.draw_debt})`);
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

            logEntry.amend(undefined, "1 draw limit");
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

        logEntry.amend(true);
    }

    /** Sends toast to a given socket explaining draw stacking */
    debtToast(socketID) {
        let title = "";

        switch (this.config.draw_stacking) {
            case "off":
                title = "Must end turn";
                break;
            case "matching":
                title = `Must stack +${this.piletop.draw} or end turn`;
                break;
            case "any":
                title = "Must stack a draw card or end turn";
                break;
        }

        io.to(socketID).emit("toast", { title });
    }

    /** Swaps 2 player's hands
     * @param {Number} pnum1 First player's ID
     * @param {Number} pnum2 Second player's ID
     */
    swapHands(pnum1, pnum2) {
        const logEntry = this.log("swapHands", ...Array.from(arguments));

        // Type check
        if(typeof pnum1 !== 'number' || typeof pnum2 !== 'number') {
            logEntry.amend(false, "Parameter type check failed");
            return;
        }

        // Invalid player(s)
        if(!this.players[pnum1] || !this.players[pnum2]) {
            console.warn("swapHands: One or both players is undefined");
            logEntry.amend(false, "One or both players is undefined");
            return;
        }

        // Swap
        [
            this.players[pnum1].cards,
            this.players[pnum2].cards,
        ] = [
            this.players[pnum2].cards,
            this.players[pnum1].cards,
        ];

        logEntry.amend(true);
    }

    /** Every player passes their hands along in the current rotation direction */
    passHands() {
        const logEntry = this.log("passHands", ...Array.from(arguments));

        const direction = this.direction;
        const hands = this.players.map(p => p.cards);
        rotateArr(hands);
        for(const i in this.players) this.players[i].cards = hands[i];

        logEntry.amend(true);
    }

    /** Player play card (attempt to put into discard pile)
     * @param {String} socketID 
     * @param {Number} cardID 
     * @param {String} action 
     * @returns {Boolean} If the move was unsuccessful, whether it not be the player's turn or the move is invalid, the method will return false
     */
    playCard(socketID, ucid, actionName, actionChoice, updateClients=true) {
        const logEntry = this.log("playCard", ...Array.from(arguments));

        // Not ingame
        if(this.state !== "ingame") {
            logEntry.amend(false, "Not ingame");
            return;
        }

        const pnum = this.getPnumFromSocketID(socketID);

        // Valid
        if(!this.isValidTurn(pnum)) return;

        // Jump-in modifier
        // const validJumpIn = this.config.jump_in;

        // Cards
        const playerCardIndex = this.players[pnum].cards.findIndex(card => card.ucid === ucid);
        const playerCard = this.players[pnum].cards[playerCardIndex];

        // Jump-in
        // if(validJumpIn) {
        //     // Allow player to jump in card matches pile
        //     if(Uno.areCardsSame(playerCard, this.piletop)) {
        //         // Continue from the player that just went
        //         this.turn = pnum;
        //     }
        // }

        // Valid turn
        // else
        if(!this.isValidTurn(pnum)) {
            logEntry.amend(false, "Not your turn");
            return;
        }

        // Card is undefined
        if(playerCard === undefined) {
            logEntry.amend(false, "playerCard is undefined");
            return;
        }



        // Card does not deflect debt
        const needsMatching = this.config.draw_stacking === "matching";
        const isMatching = playerCard.draw === this.piletop.draw;
        if(this.draw_debt > 0 && (!playerCard.draw || (needsMatching && !isMatching))) {
            this.debtToast(socketID);
            logEntry.amend(false, "Card does not deflect debt");
            return;
        }

        // Test discard pile for valid move
        if(!Uno.testCards(playerCard, this.piletop)) {
            // console.warn(`[Player ${pnum}] Invalid card`);
            logEntry.amend(false, "Card doesn't match pile");
            return;
        }

        // Pre-move action prompt
        if(actionChoice === undefined) {
            // Choose color
            if(playerCard.choose_color === true) {
                // Single-color wild, skip prompt
                if(playerCard.colors?.length === 1) {
                    actionName = "choose_color";
                    actionChoice = playerCard.colors[0];
                }

                // Prompt
                else {
                    this.action = "choose_color";
                    this.action_params = [socketID, ucid];
                    this.updateClients();
                    logEntry.amend(undefined, `Awaiting action (${this.action})`);
                    return;
                }
            }

            // Choose swap
            else if(playerCard.choose_swap === true && this.players.length !== 1) {
                this.action = "choose_swap";
                this.action_params = [socketID, ucid];
                this.updateClients();
                logEntry.amend(undefined, `Awaiting action (${this.action})`);
                return;
            }

            // Target draw
            else if(playerCard.target_draw && this.players.length !== 1) {
                this.action = "target_draw";
                this.action_params = [socketID, ucid];
                this.updateClients();
                logEntry.amend(undefined, `Awaiting action (${this.action})`);
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

        // Pass hands
        if(this.piletop.pass_hands) this.passHands();

        // End action prompt
        delete this.action;
        delete this.action_params;

        // Prep for next turn
        if(playerCard.reverse) this.direction *= -1;

        // 2 player reverse
        const twoPlayerReverse = playerCard.reverse && this.players.length === 2
        if(twoPlayerReverse) {
            this.draw_count = 0;
        }

        // Add draw card debt
        if(playerCard.draw) {
            this.draw_debt += playerCard.draw;
        }

        // Next turn
        this.nextTurn(playerCard.skip, playerCard, twoPlayerReverse);

        // Update state
        // setGame(modifiedGame);
        if(updateClients) this.updateClients();

        logEntry.amend(
            true,
            !twoPlayerReverse ? undefined : "Two player reverse"
        );
    }


    drawMultipleCards(pnum, amount) {
        if(pnum === undefined || amount === undefined) console.warn("drawMultipleCards: undefined parameter(s)");
        repeat(() => this.moveCard("deck", pnum, false, undefined, false), amount);
    }

    get piletop() { return this.pile[this.pile.length-1]; }

    /** Player action - Choose to end turn */
    endTurn(socketID) {
        const logEntry = this.log("endTurn", ...Array.from(arguments));

        // Not ingame
        if(this.state !== "ingame") {
            logEntry.amend(false, "Not ingame");
            return;
        }

        // Can't end turn yet
        if(this.draw_count === 0 && this.draw_debt === 0) {
            logEntry.amend(false, "Can't end turn yet");
            return;
        }

        // Not your turn
        const pnum = this.getPnumFromSocketID(socketID);
        if(!this.isValidTurn(pnum)) {
            logEntry.amend(false, "Not your turn");
            return;
        }

        // End turn, unless drawing with "Always Play" enabled
        const continueturn = (this.config.always_play && this.draw_debt !== 0);
        const didDrawCards = this.nextTurn(undefined, undefined, continueturn);

        // Update clients
        this.updateClients();
        if(didDrawCards) io.to(socketID).emit("scroll_cards");

        logEntry.amend(true);
    }

    /** Starts next turn
     * @param {Number} skip Number of players to skip
     * @param {Object} playerCard 
     * @param {Boolean} keepTurn Does not end current player's turn but still enacts draw cards, etc
     */
    nextTurn(skip=0, playerCard={}, keepTurn) {
        const logEntry = this.log("nextTurn", ...Array.from(arguments));

        const lastPlayerID = structuredClone(this.turn);
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
        else if(this.config.require_call) {
            const lastPlayer = this.players?.[lastPlayerID];
            if(lastPlayer !== undefined && lastPlayer?.cards?.length === 1) {
                this.waitForCallout(lastPlayerID);
            }
        }

        logEntry.amend(true);

        // Did draw cards, return true
        if(didDrawCards) return true;
    }

    /** Wait for callout */
    waitForCallout(pnum) {
        const logEntry = this.log("waitForCallout", ...Array.from(arguments));

        // Player
        const player = this.players[pnum];

        // Already pre-called
        // if(player.pre_call) {
        //     delete player.pre_call;
        //     logEntry.amend(undefined, "Player pre-called");
        //     return;
        // }

        const round = structuredClone(this.round);
        const calloutID = ++this.#calloutID;
        player.awaiting_call = calloutID;

        this.updateClients();

        logEntry.amend(undefined, "Waiting...");

        // Timer
        const timerMS = this.config.call_timer * 1000;
        setTimeout(() => {
            // Outdate timeout
            if(calloutID !== player.awaiting_call) {
                logEntry.amend(false, "calloutID didn't match");
                return;
            }

            // Called in time
            if(!player.awaiting_call) {
                logEntry.amend(true, "Called in time");
                return;
            }

            // Clear
            delete player.awaiting_call;

            // Invalid
            if(
                this.winner !== undefined || // Win screen
                round !== this.round         // Timer was from previous round
            ) {
                logEntry.amend(false, "Timeout was from previous round");
                return;
            }

            // Penalty
            if(this.config.call_penalty !== "off") {
                // Draw cards
                if(this.config.call_penalty === "draw") {
                    this.drawMultipleCards(pnum, this.config.call_draw_penalty);
                    this.emit("toast", { title:`"${this.users[player.socketID].name}" failed to call last card in time (+${this.config.call_draw_penalty})` });
                }

                // Forfeit
                else if(this.config.call_penalty === "forfeit") {
                    // Remaining player wins
                    if(this.players.length <= 2) {
                        if(this.players?.[0]?.socketID) this.winner = this.players[0].socketID;
                    }
                    
                    // Remove player
                    else this.removePlayer(pnum);

                    // Toast
                    this.emit("toast", { title:"Forfeit", msg:"Someone failed to call last card and forfeit the game"});
                }
            }

            // Update
            this.updateClients();
            logEntry.amend(true, "Done");
        }, timerMS);
    }

    /** Callout last card */
    callout(socketID) {
        const logEntry = this.log("callout", ...Array.from(arguments));

        // pnum
        const pnum = this.getPnumFromSocketID(socketID);

        // Invalid pnum
        if(pnum === -1) {
            logEntry.amend(false, "pnum was -1");
            return;
        }

        // Player
        const player = this.players[pnum];

        // Already pre-called
        // if(player.pre_call && !player.awaiting_call) {
        //     logEntry.amend(false, "Player already pre-called");
        //     return;
        // }
        // Preemptive call
        // else if(player.cards.length <= 2) player.pre_call = true;

        // Already called
        if(!player.awaiting_call/* && !player.pre_call*/) {
            logEntry.amend(false, "Not waiting for call");
            return;
        }

        delete player.awaiting_call;

        // Bubble
        this.emote(socketID, "UNO!", 1);

        // Update
        this.updateClients();
        logEntry.amend(true);
    }
}
