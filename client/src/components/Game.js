// import Icon from "./Icon.js"
import Card from "./Card.js"
import { shuffle, repeat, clamp } from "../Util.js"
import { useEffect, useState, useRef } from "react";
import { socket } from "../socket.js";
import User from "./User.js";
import lang from "../lang.js";



export default function Game({ game, setGame, startGame }) {

    // State
    // let [dialog, setDialog] = useState(null);
    // let [dialogAction, setDialogAction] = useState(null);
    const [optionsOpen, setOptionsOpen] = useState(false);

    const just_drew = useRef(false);

    const isHost = game.host === socket.id;

    // Setup
    useEffect(() => {
        // Keybinds
        const keyupHandler = (event) => {
            // Chat box is focused
            if(document.activeElement.tagName === "INPUT") return;

            const key = event.key.toUpperCase();

            // End turn
            if(key === "E") {
                endTurn();
            }

            // Play cards (1-9) - doesn't seem to work
            // if(!isNaN(Number(key))) {
            //     playCard(game.my_num, Number(key)-1)
            // }

            // Close menu
            if(key === "ESCAPE") toggleMenu();
        }
        document.addEventListener('keyup', keyupHandler);

        // Wheel event
        const playerBottom = document.querySelector(".player.position_bottom > .inner");
        const playerTop = document.querySelector(".player.position_top > .inner");
        if(playerBottom) playerBottom.addEventListener("wheel", wheelHandler);
        if(playerTop) playerTop.addEventListener("wheel", wheelHandler);
        function wheelHandler(event) {
            const element = event.currentTarget;
            element.scrollBy({
                left: event.deltaY,
                behavior: 'smooth'
            })
        }

        // Scroll cards event
        socket.on("scroll_cards", () => {
            just_drew.current = true;
        })

        return () => {
            document.removeEventListener('keyup', keyupHandler);
            if(playerBottom) playerBottom.removeEventListener("wheel", wheelHandler);
            if(playerTop) playerTop.removeEventListener("wheel", wheelHandler);
            socket.off("scroll_cards");
        }
    }, []);

    useEffect(() => {
        // Drew card, scroll container
        console.log("just drew: ", just_drew.current);
        if(!just_drew.current) return;
        just_drew.current = false;
        const me = document.querySelector('.player.me > .inner');
        if(me !== null) me.scroll({
            left: me.scrollWidth,
            behavior: 'smooth' 
        });
    }, [game])


    // Variables
    const myTurn = game.turn === game.my_num;
    const awaiting_call = Boolean(game?.players?.[game?.my_num]?.awaiting_call);
    const disableLastCard = !myTurn && !awaiting_call;
    const hightlightEndTurn = 
        (
            (
                game.draw_count !== 0 || game.draw_debt > 0
            )
            && myTurn
        ) ? false : true;

    // Only works with 4 players
    // const arrowRotation = (game.turn_rotation_value-1-game.my_num)*90;

    // Points in correct direction but arrow does not rotate in correct direction
    const arrowPosString = getPlayerOnscreenPosition(game.turn);
    console.log(arrowPosString);
    let arrowRotation = 0;
    if(arrowPosString === "left") arrowRotation = 0;
    else if(arrowPosString === "top") arrowRotation = 90;
    else if(arrowPosString === "right") arrowRotation = 180;
    else if(arrowPosString === "bottom") arrowRotation = 270;

    // Rematch count
    const playersWantRematch = game.players.filter(p => p?.wants_rematch === true).length;

    
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
            4: ["bottom", "left", "top", "right"]
        }

        return playerPositions
            ?.[game.players.length]
            ?.[clamp(playerIndex-game.my_num, game.players.length)] ?? "overlimit";
    }

    function toggleMenu() {
        setOptionsOpen(old => !old);
    }

    // --- Game functions --- //

    /** Signals the server to draw a card */
    function drawCard() {
        socket.emit("drawCard");
    }

    /** Signals the server to place one of your cards in the pile */
    function playCard(cardID) {
        socket.emit("playCard", cardID);
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

    /** Takes in a string ("deck" or "pile") or a player ID & card ID and returns the relevant DOM object */
    function getCardRect(name, index=(game?.players?.[game?.my_num]?.cards?.length-1)??1) {
        let loc;

        // Player
        try {
            if(typeof name === 'number') loc = document.querySelector(`.player_${name} .card:nth-of-type(${index+1})`);
            // Deck/pile
            else loc = document.getElementById(name);
        } catch (error) {
            console.error(error);
        }
        
        return loc?.getBoundingClientRect() ?? new DOMRect();
    }

    const startRect = getCardRect(game.animation?.fromName, game.animation?.fromIndex-1);
    const endRect = getCardRect(game.animation?.toName);
    const cardAnimated = game.animation !== undefined ?
        <Card key={game.animation_key} data={game.animation.card} animated={true} style={{
            "--start-x": `${startRect.x}px`,
            "--start-y": `${startRect.y}px`,
            "--end-x": `${endRect.x}px`,
            "--end-y": `${endRect.y}px`,
        }} />
        :
        null



    // HTML
    return (
        <>
        {/* Game container */}
        <main id="game">
            {/* Menu */}
            <div className="menu_bar flex flex_center_vertically gap_12px">
                {/* Button */}
                <button className="button_primary button_secondary button_micro button_mainbg button_border_bg_lighter hover_border_shadowed" id="menu_button" onClick={toggleMenu}>
                    <span>Menu</span>
                    {/* <kbd>ESC</kbd> */}
                </button>

                {/* Spectators */}
                {game.spectatorCount === 0 ? null :
                    <p className="secondary_text">
                        {/* Icon */}
                        <img src="/icons/eyeball.svg" alt="" class="icon_inline secondary_text" /> {game.spectatorCount} spectator{game.spectatorCount===1?"":"s"}
                    </p>
                }
            </div>

            {/* Center */}
            <div id="game_center">
                {/* Upper */}
                <div className="upper">
                    <div id="deck">
                        {/* Player {game.turn+1}'s turn<br/>
                        Deck ({game.deck.length}) */}
                        <Card data={game.deck[game.deck.length-1]} onClick={() => drawCard()} clickable={game.my_num !== -1} />
                        <div className="card_stack" style={{ "height": `${game.deck.length/4}px` }} />
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
                            <div id="arrow" style={{
                                "transform": `rotate(${arrowRotation}deg) scale(${myTurn ? "1.1" : "1"})`
                            }}>
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
                        {/* <br/>
                        Pile ({game.pile.length}) */}

                        <Card data={game.pile[game.pile.length-1]} />
                    </div>
                </div>

                {/* Lower */}
                <div className="lower">
                    {/* <button
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
                    </button> */}
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
                </div>
            </div>

            {/* Players */}
            {game.players.map((player, playerIndex) => {

                // Positioning
                const playerPosition = getPlayerOnscreenPosition(playerIndex);
                    

                // Classes
                const classes = `
                player
                player_${playerIndex}
                position_${playerPosition}
                ${playerIndex === game.my_num ? "me" : ""}
                ${game.turn === playerIndex ? "current_turn" : ""}
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

                return (
                    <div className={classes} key={playerIndex} style={styles}>
                        <h3 className="border_shadowed">
                            {<User user={game.usersParsed[player.socketID]} postName={
                                <span className="small">(P{playerIndex+1}) {String(player?.awaiting_call)}</span>
                            } />}
                        </h3>

                        {/* Cards */}
                        <div className="inner">
                            {player.cards.map((cardData, cardIndex) => {
                                return <Card data={cardData} key={cardIndex}
                                    owner={playerIndex} game={game}
                                    onClick={playerIndex === game.my_num ?
                                        function() { playCard(cardIndex) } :
                                        undefined
                                    }
                                />
                            })}
                        </div>
                    </div>
                )
            })}
        </main>

        {/* Animation overlay */}
        <div className="animation_container">
            {cardAnimated}
        </div>

        {/* Dialog */}
        {myTurn ?
            (
                // Choose color
                game.action === 'choose_color' ?
                <div className="choice_popup choose_color">
                    <h3 className="border_shadowed">CHOOSE A COLOR</h3>
                    <div className="choose_color_container">
                        <div className="red hover_border_shadowed" role="button" tabIndex="0" onClick={() => action("red")} />
                        <div className="yellow hover_border_shadowed" role="button" tabIndex="0" onClick={() => action("yellow")} />
                        <div className="green hover_border_shadowed" role="button" tabIndex="0" onClick={() => action("green")} />
                        <div className="blue hover_border_shadowed" role="button" tabIndex="0" onClick={() => action("blue")} />
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
                        {Object.entries(game.usersParsed).map(([socketID, user], index) => {
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
                        {Object.entries(game.usersParsed).map(([socketID, user], index) => {
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
                : null
            )
        : null
        }

        {/* Win screen */}
        {game?.winner !== undefined ?
        <div id="win_screen" className="overlay">
            <div className="inner">
                <h2 className="border_shadowed">
                    {game.winner === socket.id ?
                        "You win! 🎉" :
                        `${game.usersParsed[game.winner]?.name} won...`
                    }
                </h2>

                <User user={game.usersParsed[game.winner]} classes="big_user" />
                <br/>

                <p className={`${playersWantRematch === 0 ? "secondary_text" : "bounce"} center`}>
                    {
                        game.players.length !== 1 ?
                        `${playersWantRematch}/${game.players.length-1} players have requested a rematch` :
                        "Very impressive"
                    }
                </p><br/>

                {/* Buttons */}
                <div className="flex media_flex col gap_6px">
                    {/* Rematch */}
                    {isHost ?
                        <button className="button_primary button_secondary hover_border_shadowed" onClick={startGame}>
                            Play again
                        </button>
                        :
                        <button className="button_primary button_secondary hover_border_shadowed" onClick={requestRematch} disabled={(game.players?.[game.my_num]?.wants_rematch || game.my_spectating) ? true : false}>
                            Request rematch
                        </button>
                    }
                    {/* Leave */}
                    {isHost ?
                    <button className="button_primary button_secondary button_transparent hover_border_shadowed position_relative" onClick={returnToLobby}>
                        <span>Back to lobby</span>
                    </button>
                    :
                    <button className="button_primary button_secondary button_transparent hover_border_shadowed" onClick={leaveGame}>
                        Leave
                    </button>
                    }
                </div>
            </div>
        </div>
        : null
        }


        {/* Menu */}
        {optionsOpen ?
        <div id="menu" className="overlay">
            <div className="inner">
                <h2 className="border_shadowed">Menu</h2>

                {/* Info */}
                <div className="flex">
                    {/* Players */}
                    {/* <div className="users_list">
                        {Object.entries(game.usersParsed).map(([, user], index) => {
                            return <User
                                key={index} user={user} game={game}
                                title={`ID: ${user.socketID}
                                ${isHost ? " (Host)":""}`}
                            />
                        })}
                    </div> */}

                    {/* Config */}
                    <div className="fullwidth">
                        {/* <h4>Config</h4> */}
                        <table className="fullwidth">
                            {Object.entries(game.config).map(([key, value]) => {
                                // Skip
                                if(value === false || key === "enable_chat" || key === "public_lobby") return null;

                                // Row
                                return (
                                    <tr>
                                        <th>{lang.en[key]}</th>
                                        <td className="text_align_right">{lang.en[String(value)] ?? String(value)}</td>
                                    </tr>
                                )
                            })}
                        </table>
                    </div>
                </div>
                <br/>
                <br/>

                {/* Return to lobby */}
                {/* <button className="button_primary button_secondary button_lightbg hover_border_shadowed position_relative" onClick={returnToLobby}>
                        <span>Back to lobby</span>
                </button>
                <br/> */}
                
                {/* Buttons */}
                <div className="flex flex_column gap_12px">
                    <div className="flex media_flex col gap_12px">
                        {/* Leave */}
                        <button className="button_primary button_secondary hover_border_shadowed position_relative" onClick={toggleMenu}>
                            <span>Return to game</span>
                            <kbd>ESC</kbd>
                        </button>

                        {/* Leave */}
                        <button className="button_primary button_secondary button_transparent hover_border_shadowed" onClick={leaveGame}>
                            <span>
                                {game.my_num !== -1 ?
                                "Quit game" :
                                "Stop spectating"
                                }
                            </span>
                        </button>
                    </div>

                    {/* Return to lobby */}
                    {!isHost ? null :
                        <button className="button_primary button_secondary hover_border_shadowed button_transparent" onClick={returnToLobby}>
                            <span>Back to lobby</span>
                        </button>
                    }
                </div>
            </div>
        </div>
        :
        null
        }

        </>
    );
}
