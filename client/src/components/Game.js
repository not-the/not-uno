// import Icon from "./Icon.js"
import Card from "./Card.js"
import { shuffle, repeat, clamp } from "../Util.js"
import { useEffect, useState } from "react";
import { socket } from "../socket.js";
import User from "./User.js";
import lang from "../lang.js";



export default function Game({ game, setGame, startGame }) {

    // State
    // let [dialog, setDialog] = useState(null);
    // let [dialogAction, setDialogAction] = useState(null);
    const [optionsOpen, setOptionsOpen] = useState(false);

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

        return () => {
            document.removeEventListener('keyup', keyupHandler);
        }
    }, [])


    // Variables
    const myTurn = game.turn === game.my_num;
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
    let arrowRotation = 0;
    if(arrowPosString === "top") arrowRotation = 90;
    else if(arrowPosString === "right") arrowRotation = 180;
    else arrowRotation = 270;

    // Rematch count
    const playersWantRematch = game.players.filter(p => p.wants_rematch === true).length;

    
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

    /** Signals the server the action the player would like to take after using an action card
     * @param {*} choice Player choice data
     */
    function action(choice) {
        console.log(choice);
        socket.emit("action", choice);
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
            <button className="button_primary button_secondary button_micro button_mainbg hover_border_shadowed" id="menu_button" onClick={toggleMenu}>
                <span>Menu</span>
                {/* <kbd>ESC</kbd> */}
            </button>

            {/* Center */}
            <div id="game_center">
                {/* Upper */}
                <div className="upper">
                    <div id="deck">
                        {/* Player {game.turn+1}'s turn<br/>
                        Deck ({game.deck.length}) */}
                        <Card data={game.deck[game.deck.length-1]} onClick={() => drawCard()} />
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
                    <button className="button_primary button_secondary button_lightbg hover_border_shadowed position_relative" disabled>
                        <kbd>Q</kbd>
                        <span>Last card</span>
                    </button>
                    <button className="button_primary button_secondary button_lightbg hover_border_shadowed position_relative" onClick={endTurn} disabled={hightlightEndTurn}>
                        <kbd>E</kbd>
                        <span>End turn</span>
                        {/*!myTurn || */game.draw_debt === 0 ? null :
                            <div className="debt_indicator">
                                +{game.draw_debt}
                            </div>
                        }
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
                                <span className="small">(P{playerIndex+1})</span>
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
                </div>
                : null
            )
        : null
        }

        {/* Win screen */}
        {game?.winner !== undefined ?
        <div id="win_screen" class="overlay">
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
                    {game.host === socket.id ?
                        <button className="button_primary button_secondary hover_border_shadowed" onClick={startGame}>
                            Play again
                        </button>
                        :
                        <button className="button_primary button_secondary hover_border_shadowed" onClick={requestRematch} disabled={game.players[game.my_num].wants_rematch ? true : false}>
                            Request rematch
                        </button>
                    }
                    {/* Leave */}
                    <button className="button_primary button_secondary button_transparent hover_border_shadowed" onClick={leaveGame}>
                        Leave
                    </button>
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
                                ${user.socketID === game.host ? " (Host)":""}`}
                            />
                        })}
                    </div> */}

                    {/* Config */}
                    <div className="fullwidth">
                        {/* <h4>Config</h4> */}
                        <table className="fullwidth">
                            {Object.entries(game.config).map(([key, value]) => {
                                // Skip
                                if(value === false || key === "chat" || key === "public_lobby") return null;

                                // Row
                                return (
                                    <tr>
                                        <th>{lang.en[key]}</th>
                                        <td class="text_align_right">{lang.en[String(value)] ?? String(value)}</td>
                                    </tr>
                                )
                            })}
                        </table>
                    </div>
                </div>
                <br/>
                <br/>
                
                {/* Buttons */}
                <div className="flex media_flex col gap_6px">
                    {/* Leave */}
                    <button className="button_primary button_secondary button_lightbg hover_border_shadowed position_relative" onClick={toggleMenu}>
                        <span>Return to game</span>
                        <kbd>ESC</kbd>
                    </button>

                    {/* Leave */}
                    <button className="button_primary button_secondary button_transparent hover_border_shadowed" onClick={leaveGame}>
                        <span>Quit game</span>
                    </button>
                </div>
            </div>
        </div>
        :
        null
        }

        </>
    );
}
