import { useEffect, useState, useRef } from "react"
import { socket } from "../socket.js"
import { clamp } from "../Util.js"
import { colorblind } from "../App.js"

// Components
import Card from "./Card.js"
import User from "./User.js"
import CardAnimated from "./CardAnimated.js"
import CardStack from "./CardStack.js"
import PlayerDisconnectOverlay from "./PlayerDisconnectOverlay.js"
import EmoteReactions from "./EmoteReactions.js"
import EmoteBubble from "./EmoteBubble.js"
import GameMenu from "./GameMenu.js"
import WinScreen from "./WinScreen.js"
import Advertisement from "./Advertisement.js"
import Spectators from "./Spectators.js"


/** Game screen component */
export default function Game({ game, setGame, startGame, toggleColorblind }) {
    // State
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [sortCards, setSortCards] = useState(Boolean(localStorage.getItem("notuno_sort_cards") ?? false));
    const just_drew = useRef(false);

    // Variables
    const myTurn = game.turn === game.my_num;
    const isHost = game.host === socket.id;
    const awaiting_call = Boolean(game?.players?.[game?.my_num]?.awaiting_call) && !game.winner;
    const disableLastCard = !(myTurn || awaiting_call);
    const hightlightEndTurn = 
        (
            (
                game.draw_count !== 0 || game.draw_debt > 0
            )
            && myTurn
        ) ? false : true;

    // Setup
    useEffect(() => {
        // Keybinds
        const keypressHandler = (event) => {
            // Chat box is focused
            if(document.activeElement.tagName === "INPUT") return;

            const key = event.key.toUpperCase();

            // Keybinds
            if(key === "E") endTurn();          // End turn
            else if(key === "D") drawCard();    // Draw card
            else if(key === "Q") callout();  // Callout

            // Play cards (1-9)
            const number = Number(key);
            if(!isNaN(number)) {
                const ucid = document.querySelector(`.player.me .card:nth-of-type(${number})`)?.id;
                if(ucid !== undefined) playCard(ucid);
            }

            // Close menu
            if(key === "ESCAPE") toggleMenu();
        }
        document.addEventListener('keypress', keypressHandler);

        // Wheel event
        const playerBottom = document.querySelector(".player.position_bottom > .inner");
        const playerTop = document.querySelector(".player.position_top > .inner");
        if(playerBottom) playerBottom.addEventListener("wheel", wheelHandler);
        if(playerTop) playerTop.addEventListener("wheel", wheelHandler);
        function wheelHandler(event) {
            const element = event.currentTarget;
            element.scrollBy({
                left: event.deltaY
            })
        }

        // Scroll cards event
        socket.on("scroll_cards", (ucid) => {
            just_drew.current = ucid;
        })

        return () => {
            document.removeEventListener('keyup', keypressHandler);
            if(playerBottom) playerBottom.removeEventListener("wheel", wheelHandler);
            if(playerTop) playerTop.removeEventListener("wheel", wheelHandler);

            socket.off("scroll_cards");
        }
    }, []);


    const playerMeInner = useRef(null);

    useEffect(() => {
        // My turn SFX
        // if(myTurn) {
        //     const sfx = new Audio("/sounds/ding-sound-246413.mp3");
        //     sfx.volume = 0.6;
        //     sfx.play();
        // }

        // Drew card, scroll container
        if(just_drew.current) {
            // Get card element
            const newestCard = document.getElementById(just_drew.current);

            // Scroll it into view
            if(newestCard !== null) {
                newestCard.scrollIntoView({ behavior: 'smooth' });
            }

            just_drew.current = false;
        }

    }, [game])

    // Points in correct direction but arrow does not rotate in correct direction
    const arrowPosString = getPlayerOnscreenPosition(game.turn);

    /** @type {HTMLElement} */
    const arrowElement = document.querySelector("#arrow");
    let rotationOld = arrowElement?.dataset?.rotation ?? 0;
    rotationOld = Number(rotationOld);

    /** Object containing player positions (keys) and arrow rotation values (values) */
    const targets = {
        "left": 0,
        "top": 90,
        "right": 180,
        "bottom": 270,
        // "topleft": 45,
        // "topright": 135
    }
    
    // Target
    let rotationTarget = targets[arrowPosString] ?? 0;

    // Needed change to rotation
    let change = ((rotationTarget - rotationOld + 180) % 360) - 180;
    if(game.direction === 1 && change < 0) change += 360;               // Clockwise
    else if(game.direction === -1 && change > 0) change -= 360;         // Counter clockwise

    // Set rotation
    rotationTarget = rotationOld + change;

    // Clockwise
    // if(game.direction === 1) {
    //     while(arrowRotation > rotationTarget) {
    //         rotationTarget += 360;
    //     }
    // }
    // // Counter clockwise
    // else if(game.direction === -1) {
    //     while(arrowRotation < rotationTarget) {
    //         rotationTarget -= 360;
    //     }
    // }

    
    /** Returns a string (bottom, left, right, or top) based on a player ID
     * @param {Number} playerIndex Player ID
     * @param {Object} game Game object
     * @returns {String} bottom/left/right/top
     */
    function getPlayerOnscreenPosition(playerIndex) {
        const playerPositions = {
            1: ["bottom"],
            2: ["bottom", "top"],
            3: ["bottom", "left", "top"],
            4: ["bottom", "left", "top", "right"],
            5: ["bottom", "left", "topleft", "topright", "right"]
        }

        return playerPositions
            ?.[game.players.length]
            ?.[clamp(playerIndex-game.my_num, game.players.length)] ?? "overlimit";
    }

    /** Toggles the pause menu */
    function toggleMenu() {
        setOptionsOpen(old => !old);
    }

    /** Toggles card sorting */
    function toggleSortCards() {
        setSortCards(old => {
            localStorage.setItem("notuno_sort_cards", !old);
            return !old;
        });
    }

    // --- Game functions --- //

    /** Signals the server to draw a card */
    function drawCard() {
        socket.emit("drawCard");
    }

    /** Signals the server to place one of your cards in the pile */
    function playCard(ucid) {
        socket.emit("playCard", ucid);
    }

    /** Requests the server to end your turn */
    function endTurn() {
        socket.emit("endTurn");
    }

    /** Signals the server to call your last card */
    function callout() {
        socket.emit("callout");
    }

    /** Signals the server the action the player would like to take after using an action card
     * @param {*} choice Player choice data
     */
    function action(choice) {
        socket.emit("action", choice);
    }

    /** Signals the server to cancel the current action */
    function cancelAction() {
        socket.emit("action", null);
    }

    /** Asks the server to return to lobby */
    function returnToLobby() {
        socket.emit("returnToLobby");
    }

    /** Asks the server to leave the current game */
    function leaveGame() {
        socket.emit("leave");
    }

    /** Request a rematch */
    function requestRematch() {
        socket.emit("requestRematch");
    }

    /** Requests the server to remove a disconnected player
     * @param {Number} pnum Player index
     */
    function removeDisconnectedPlayer(pnum) {
        socket.emit("removeDisconnectedPlayer", pnum);
    }


    // HTML
    return (<>
        {/* Game container */}
        <div id="main_wrapper">
            {/* Advertisement */}
            <div className="ad_container">
                <Advertisement />
            </div>

            {/* Game */}
            <div id="content">
                <main id="game">
                    {/* Menu */}
                    <div className="menu_bar flex flex_center_vertically gap_12px">
                        {/* Button */}
                        <button className="button_primary button_secondary button_micro button_mainbg button_border_bg_lighter hover_border_shadowed" id="menu_button" onClick={toggleMenu}>
                            <span>Menu</span>
                            {/* <kbd>ESC</kbd> */}
                        </button>

                        {/* Emotes */}
                        {game.config.reactions ? <EmoteReactions /> : null}

                        {/* Spectators */}
                        <Spectators game={game} />
                    </div>

                    {/* Visual effects */}
                    {/* Big Rotation arrows */}
                    <img
                        src="/icons/Big Rotation Arrows.svg" alt=""
                        id="big_rotation_arrows"
                        className={game.direction === 1 ? null : "counter_cw"}
                        key={game.direction}
                    />

                    {/* Center */}
                    <div id="game_center">
                        {/* Upper */}
                        <div className="upper">
                            <div id="deck">
                                <Card data={game.deck[game.deck.length-1]} onClick={() => drawCard()} clickable={game.my_num !== -1} />
                                <CardStack array={game.deck} />
                            </div>

                            {/* Middle */}
                            <div className="middle border_shadowed" data-my-turn={myTurn}>
                                {/* Rotation */}
                                <div id="rotation" style={{
                                    "transform": `rotate(${game.turn_rotation_value*45}deg) scale(${game.direction}, 1)`
                                }}>
                                    ↻
                                </div>

                                {/* Arrow */}
                                <div className="arrow_container">
                                    {/* rot {arrowRotation}<br/>
                                    target {rotationTarget} */}
                                    <div
                                        id="arrow"
                                        data-rotation={rotationTarget}
                                        style={{
                                            "transform": `rotate(${rotationTarget}deg) scale(${myTurn ? "1.1" : "1"})`
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 117 116">
                                            <path id="Arrow" d="M0,58,59,0V28h58V87H59v29Z" fill="#fff"/>
                                        </svg>
                                    </div>
                                </div>

                                {/* Extra */}
                                <div className="turn">
                                    P{game.turn+1}
                                </div>
                            </div>

                            {/* Pile */}
                            <div id="pile">
                                <Card data={game.pile[game.pile.length-1]} />
                                <CardStack array={game.pile} />
                            </div>
                        </div>

                        {/* Lower */}
                        <div className="lower">
                            {/* End turn */}
                            <button className="button_primary button_secondary button_lightbg hover_border_shadowed position_relative" onClick={endTurn} disabled={hightlightEndTurn}>
                                <span>
                                    {
                                        game.config.always_play && game.draw_debt !== 0 ?
                                        "Draw cards" :
                                        "End turn"
                                    }
                                </span>
                                {/*!myTurn || */game.draw_debt === 0 ? null :
                                    <div className="debt_indicator">
                                        +{game.draw_debt}
                                    </div>
                                }
                                <kbd>E</kbd>
                            </button>

                            {/* Callout */}
                            {!game.config.require_call ? null :
                                <button
                                    id="last_card"
                                    className="button_primary button_secondary button_lightbg hover_border_shadowed position_relative"
                                    onClick={callout}
                                    disabled={disableLastCard}
                                    data-timer={awaiting_call}
                                    style={{
                                        "--duration": `${game.config.call_timer}s`
                                    }}
                                >
                                    <div className="under progress" />
                                    <span>Last card</span>
                                    <div className="over progress" />
                                    <kbd>Q</kbd>
                                </button>
                            }
                        </div>
                    </div>

                    {/* Players */}
                    {game.players.map((player, playerIndex) => {

                        // Positioning
                        const playerPosition = getPlayerOnscreenPosition(playerIndex);

                        const user = game.usersPlayers[player.socketID];
                        const isMe = playerIndex === game.my_num;

                        // Classes
                        const classes = `
                        player
                        player_${playerIndex}
                        position_${playerPosition}
                        ${isMe ? "me" : ""}
                        ${game.turn === playerIndex ? "current_turn" : ""}
                        ${!isMe && game.players.length > 4 ? "player_small" : ""}
                        `;

                        // CIRCULAR POSITIONING
                        // const angle = clamp(
                        //     (360 / (game.players.length)) + (playerIndex*90) - 90,
                        //     360
                        // );
                        // const x = Math.cos(angle) * (window.innerWidth/2) + (window.innerWidth/2);
                        // const y = Math.sin(angle) * (window.innerHeight/2) + (window.innerHeight/2);
                        // const styles = {
                        //     "left": x,
                        //     "bottom": y,
                        //     "transform": `translateX(-50%) rotate(${angle}deg)`
                        // };

                        // console.log(angle);

                        const styles = undefined;

                        // Cards
                        let cards = [...player.cards];

                        // Sort
                        if(sortCards) {
                            // Sort cards
                            cards = cards.sort((a, b) => {
                                const cc = a?.color?.localeCompare?.(b.color);
                                if(cc !== 0) return cc; // Color
                                return a?.type?.localeCompare?.(b.type); // Type
                            })
                        }

                        // Cards JSX
                        let cardsJSX = cards.map((cardData) => {
                            return <Card
                                data={cardData} key={cardData.ucid}
                                owner={playerIndex} game={game}
                                onClick={isMe ?
                                    function() { playCard(cardData.ucid) } :
                                    undefined
                                }
                            />
                        })

                        return (
                            <div className={classes} key={playerIndex} style={styles}>
                                {/* User disconnected */}
                                <PlayerDisconnectOverlay
                                    game={game} player={player} playerIndex={playerIndex}
                                    returnToLobby={returnToLobby}
                                    removeDisconnectedPlayer={removeDisconnectedPlayer}
                                />

                                {/* Upper */}
                                <div className="player_upper border_shadowed flex flex_center_vertically">
                                    {/* Name */}
                                    <h3>
                                        {<User
                                            user={user}
                                            postName={<span className="small">(P{playerIndex+1})</span>}
                                        />}
                                    </h3>

                                    <EmoteBubble socketID={user?.socketID} />

                                    {/* Buttons */}
                                    {!isMe ? null : <>
                                        <div className="player_buttons flex gap_12px">
                                            {/* Colorblind mode */}
                                            <div data-title={colorblind ? "Differentiate without color (Enabled)" : "Differentiate without color"}>
                                                <div
                                                    className="player_button cursor_pointer"
                                                    role="checkbox" tabIndex="0"
                                                    aria-checked={colorblind}
                                                    onClick={toggleColorblind}
                                                >
                                                    <img src="/icons/eyeball.svg" alt="Differentiate without color" />
                                                </div>
                                            </div>

                                            {/* Sort cards */}
                                            <div data-title={sortCards ? "Sort cards (Enabled)" : "Sort cards"}>
                                                <div
                                                    className="player_button card_sort_button cursor_pointer"
                                                    role="checkbox" tabIndex="0"
                                                    aria-checked={sortCards}
                                                    
                                                    onClick={toggleSortCards}
                                                >
                                                    <img src="/icons/Sort.svg" alt="Sort Cards" />
                                                </div>
                                            </div>
                                        </div>
                                    </>}
                                </div>

                                {/* Cards */}
                                <div className="inner">
                                    {cardsJSX}
                                </div>
                            </div>
                        )
                    })}
                </main>

                {/* Dialog */}
                {myTurn ?
                    (
                        // Choose color
                        game.action === 'choose_color' ?
                        <div className="choice_popup choose_color">
                            <h3 className="border_shadowed">CHOOSE A COLOR</h3>
                            <div className="choose_color_container">
                                {(game.players?.[game.my_num]?.cards?.find(c => c.ucid === game?.action_params?.[1])?.colors ?? ["red", "blue", "yellow", "green"]).map(color => {
                                    return <div className={`${color} hover_border_shadowed`} role="button" tabIndex="0" onClick={() => action(color)} />
                                })

                                }
                            </div>

                            {/* Cancel */}
                            <br/>
                            <button class="button_primary button_secondary hover_border_shadowed" onClick={cancelAction}>Cancel</button>
                        </div>
                        :

                        // Choose swap
                        game.action === 'choose_swap' ?
                        <div className="choice_popup choose_swap">
                            <h3>Swap hands:</h3>
                            <div className="users_list">
                                {Object.entries(game.usersPlayers).map(([socketID, user], index) => {
                                    // Exclude self
                                    return socketID === socket.id ? null
                                    :
                                    <User key={index} user={user} game={game} tagline={`P${index+1}`} onClick={() => action(index)} classes="cursor_pointer" />
                                })}
                            </div>

                            {/* Cancel */}
                            <br/>
                            <button class="button_primary button_secondary hover_border_shadowed" onClick={cancelAction}>Cancel</button>
                        </div>
                        :

                        // Target draw
                        game.action === 'target_draw' ?
                        <div className="choice_popup choose_swap">
                            <h3>Give +{2} to:</h3>
                            <div className="users_list">
                                {Object.entries(game.usersPlayers).map(([socketID, user], pnum) => {
                                    // Exclude self
                                    return socketID === socket.id ? null
                                    :
                                    <User key={pnum} user={user} game={game} tagline={`P${pnum+1}`} onClick={() => action(pnum)} classes="cursor_pointer" />
                                })}
                            </div>

                            {/* Cancel */}
                            <br/>
                            <button class="button_primary button_secondary hover_border_shadowed" onClick={cancelAction}>Cancel</button>
                        </div>
                        : null
                    )
                : null
                }

                {/* Win screen */}
                {game?.winner === undefined ? null :
                    <WinScreen game={game} isHost={isHost} startGame={startGame} requestRematch={requestRematch} returnToLobby={returnToLobby} leaveGame={leaveGame} />
                }


                {/* Menu */}
                {!optionsOpen ? null :
                    <GameMenu game={game} isHost={isHost} toggleMenu={toggleMenu} leaveGame={leaveGame} returnToLobby={returnToLobby} />
                }
            </div>
        </div>

        {/* Animation overlay */}
        <CardAnimated animation={game.animation} animation_key={game.animation_key} />
    </>);
}
