// import Icon from "./Icon.js"
import Card from "./Card.js"
import { shuffle, repeat, clamp } from "../Util.js"
import { useEffect } from "react";
import { socket } from "../socket.js";
import User from "./User.js";



export default function Game({ game, setGame, startGame }) {

    // State
    // let [dialog, setDialog] = useState(null);
    // let [dialogAction, setDialogAction] = useState(null);

    // Setup
    useEffect(() => {
        // Keybinds
        const keyupHandler = (event) => {
            const key = event.key.toUpperCase();

            console.log(key);

            if(key === "E") {
                endTurn();
            }

            // Play cards (1-9) - doesn't seem to work
            // if(!isNaN(Number(key))) {
            //     playCard(game.my_num, Number(key)-1)
            // }
        }
        document.addEventListener('keyup', keyupHandler);

        return () => {
            document.removeEventListener('keyup', keyupHandler);
        }
    }, [])

    const myTurn = game.turn === game.my_num;
    const hightlightEndTurn = 
        game.draw_count !== 0 &&
        myTurn
            ? false : true;

    // Only works with 4 players
    const arrowRotation = (game.turn_rotation_value-1-game.my_num)*90;

    // Player functions
    function drawCard() {
        socket.emit("drawCard");
    }

    // Place card in pile and enact its effects
    function playCard(cardID) {
        socket.emit("playCard", cardID);
    }

    function endTurn() {
        socket.emit("endTurn");
    }

    function action(choice) {
        console.log(choice);
        socket.emit("action", choice);
    }

    function leaveGame() {
        socket.emit("leave");
    }

    function requestRematch() {
        socket.emit("requestRematch");
    }


    function getCardRect(name, index=(game?.players?.[game?.my_num]?.cards?.length-1)??1) {
        let loc;

        // Player
        if(typeof name === 'number') loc = document.querySelector(`.position_${name} .card:nth-of-type(${index+1})`);
        // Deck/pile
        else loc = document.getElementById(name);
        
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
                    <button class="button_primary button_secondary button_lightbg hover_border_shadowed" disabled>
                        <kbd>Q</kbd>
                        <span>Last card</span>
                    </button>
                    <button className="button_primary button_secondary button_lightbg hover_border_shadowed" onClick={endTurn} disabled={hightlightEndTurn}>
                        <kbd>E</kbd>
                        <span>End turn</span>
                    </button>
                </div>
            </div>

            {/* Players */}
            {game.players.map((player, playerIndex) => {
                // Classes
                const classes = `
                player
                position_${clamp(playerIndex-game.my_num, game.players.length)}
                ${playerIndex === game.my_num ? "me" : ""}
                `;

                // POSITIONING
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
        {game.turn === game.my_num && game.action === 'choose_color' ?
            <div className="choose_color">
                <h3>CHOOSE A COLOR</h3>
                <div className="choose_color_container">
                    <div className="red hover_border_shadowed" role="button" tabIndex="0" onClick={() => action("red")} />
                    <div className="yellow hover_border_shadowed" role="button" tabIndex="0" onClick={() => action("yellow")} />
                    <div className="green hover_border_shadowed" role="button" tabIndex="0" onClick={() => action("green")} />
                    <div className="blue hover_border_shadowed" role="button" tabIndex="0" onClick={() => action("blue")} />
                </div>
            </div>
        : null
        }

        {/* Win screen */}
        {game?.winner !== undefined ?
        <div id="win_screen">
            <div className="inner">
                <h2 class="border_shadowed">
                    {game.winner === socket.id ?
                        "You win! 🎉" :
                        `${game.usersParsed[game.winner]?.name} won...`
                    }
                </h2>

                <User user={game.usersParsed[game.winner]} />
                <br/>

                <p className="secondary_text center">
                    {game.players.filter(p => p.wants_rematch === true).length}/{game.players.length-1} players have requested a rematch
                </p><br/>

                {/* Buttons */}
                <div className="flex media_flex col" style={{ "gap":"6px" }}>
                    {/* Rematch */}
                    {game.host === socket.id ?
                        <button class="button_primary button_secondary hover_border_shadowed" onClick={startGame}>
                            Play again
                        </button>
                        :
                        <button class="button_primary button_secondary hover_border_shadowed" onClick={requestRematch} disabled={game.players[game.my_num].wants_rematch ? true : false}>
                            Request rematch
                        </button>
                    }
                    {/* Leave */}
                    <button class="button_primary button_secondary button_transparent hover_border_shadowed" onClick={leaveGame}>
                        Leave
                    </button>
                </div>
            </div>
        </div>
        : null
        }

        </>
    );
}
