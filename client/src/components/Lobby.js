// import { config } from "./App"
// import { useState } from "react";
import { socket } from "../socket.js";
import User from "./User.js"
import Config from "./Config.js"
import ConfigDeck from "./ConfigDeck.js"
import { clientData } from "../App";
import EmoteBubble from "./EmoteBubble.js";
import EmoteReactions from "./EmoteReactions.js";
// import lang from "../lang.js";

export default function Lobby({ game, startGame, toast, leaveGame, setProfileOpen }) {

    const playerMax = game.config.max_players;
    const playerCount = game.playerCount;
    const startButtonTooltip = socket?.id !== game?.host ? "Ask the host to start the game" : null;
    const isHost = game.host === socket.id;


    function shareRoom() {
        // URL PLACEHOLDER
        window.navigator.share({
            url: `${window.location.origin}/#${game.roomID}`,
            text: "Play NOT UNO with me!"
        });
    }

    // Copies URL to clipboard
    function copyRoom() {
        navigator.clipboard.writeText(`${window.location.origin}/#${game.roomID}`);
        toast({
            title: "Copied URL to clipboard!",
            msg: "Share it to invite your friends"
        });

    }

    return (
        <>
            {/* Upper */}
            <main id="lobby" className="container">

                <div className="cols_container media_flex_wide">
                    {/* Left */}
                    <div className="col left_col">
                        {/* Lobby info */}
                        <div className="lobby_info">
                            <h3 className="border_shadowed">
                                Lobby<span className="small">(Room {game.roomID})</span>
                            </h3>

                            {/* Start */}
                            <button className="button_primary button_green border_shadowed"
                                onClick={startGame}
                                disabled={!isHost}
                                data-title={startButtonTooltip}
                            >
                                <img src="/icons/play.svg" alt="" className="border_shadowed" />
                                <span className="border_shadowed">
                                    START
                                </span>
                            </button>
                            <br/>

                            {/* Share */}
                            <div className="button_primary button_lightbg no_interact">
                                <img src="/icons/person.svg" alt="" className="border_shadowed" />
                                <div>
                                    <span className="border_shadowed">
                                        Invite your friends
                                    </span>

                                    {/* Buttons */}
                                    <div className="flex gap_6px">
                                        {/* Share sheet */}
                                        <button className="button_primary button_secondary share_button button_lightbg hover_border_shadowed"
                                            onClick={shareRoom}
                                        >
                                            {/* Replace with non-breaking hyphens */}
                                            <span>{game.roomID.replaceAll("-", "‑")}</span>

                                            <img src="/icons/Share.svg" alt="" className="float_right parent_invert" />
                                        </button>

                                        {/* Copy to clipboard */}
                                        <button
                                            className="button_primary button_secondary share_button button_lightbg button_micro"
                                            data-title="Copy link to clipboard"
                                            onClick={copyRoom}
                                        >
                                            <img src="/icons/content_copy_20dp_FFFFFF_FILL0_wght600_GRAD200_opsz20.svg" alt="Copy link to clipboard" className="parent_invert" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <br/>

                            {/* Leave */}
                            <button className="button_primary button_secondary button_lightbg hover_border_shadowed"
                                onClick={leaveGame}
                            >
                                <span>
                                    {!game.my_spectating ? "Leave" : "Stop spectating"}
                                </span>
                            </button>
                        </div>
                        <br/>

                        {/* Players */}
                        <div>
                            {/* Title */}
                            <div className="flex flex_center_vertically">
                                <h3 className="border_shadowed">Players</h3>
                                <h4 className={`player_count margin_left_auto${playerCount >= playerMax ? " full border_shadowed" : ""}`}>
                                    {game.isFull ? "Full" : null} {playerCount}/{playerMax}
                                </h4>
                            </div>

                            {/* Spectating */}
                            {game.spectatorCount === 0 ? null :
                                <div className="secondary_text">
                                    {/* Icon */}
                                    <img src="/icons/eyeball.svg" alt="" className="icon_inline secondary_text" /> {game.spectatorCount} spectator{game.spectatorCount===1?"":"s"}

                                    <br/>
                                    <br/>
                                </div>
                            }

                            {/* List */}
                            <div className="users_list">
                                {Object.entries(game.usersPlayers).map(([, user], index) => {
                                    return <User
                                        key={index} user={user} game={game}
                                        title={`ID: ${user.socketID}
                                        ${user.socketID === game.host ? " (Host)":""}`}
                                        postName={<EmoteBubble socketID={user?.socketID} />}
                                        setProfileOpen={setProfileOpen}
                                    />
                                })}
                            </div>

                            {/* Reactions */}
                            <br/>
                            {game.config.reactions ? <EmoteReactions wrap={true} /> : null}
                        </div>
                    </div>

                    {/* Right */}
                    <div id="config" className="col right_col">
                        {/* Deck */}
                        <section>
                            <h3 className="fancy_title">
                                <span>Deck</span>
                            </h3>
                            
                            {/* Decks */}
                            <ConfigDeck game={game} />
                        </section>

                        {/* Room Options */}
                        <section>
                            <h3 className="fancy_title">
                                <span>Room Options</span>
                            </h3>

                            <Config name="public_lobby" game={game} />
                            <Config name="visible_over_same_network" game={game} />
                            <Config name="spectators" game={game} />
                            <Config name="enable_chat" game={game} />
                            <Config name="reactions" game={game} />
                            <Config name="max_players" game={game} />
                        </section>

                        {/* Game */}
                        <section>
                            <h3 className="fancy_title">
                                <span>Modifiers</span>
                            </h3>
                            <Config name="starting_cards" game={game} />
                            <Config name="draw_stacking" game={game} />
                            <Config name="who_goes_first" game={game} />
                            <Config name="xray" game={game} />
                            <Config name="infinite_draw" game={game} />
                            <Config name="always_play" game={game} />
                            {/* <Config name="jump_in" game={game} /> */}
                            {/* <Config name="continue" game={game} disabled={true} /> */}
                        </section>

                        <section>
                            <h3 className="fancy_title">
                                <span>Callouts (WIP)</span>
                            </h3>
                            <Config name="require_call" game={game} />
                            <Config name="call_timer" game={game} />
                            <Config name="call_penalty" game={game} />
                            <Config name="call_draw_penalty" game={game} />
                        </section>
                    </div>

                </div>
            </main>
        </>
    )
}
