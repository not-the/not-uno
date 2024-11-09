// import { config } from "./App"
// import { useState } from "react";
import { socket } from "../socket.js";
import User from "./User.js"
import Config from "./Config.js"
// import lang from "../lang.js";

export default function Lobby({ game, startGame, toast, leaveGame }) {

    const playerMax = 4;
    const playerCount = Object.keys(game.usersParsed).length;
    const startButtonTooltip = socket?.id !== game?.host ? "Ask the host to start the game" : null;


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

                <div className="cols_container media_flex">
                    {/* Left */}
                    <div className="col">
                        <h3 className="border_shadowed">
                            Lobby<span className="small">(Room {game.roomID})</span>
                        </h3>

                        {/* Start */}
                        <button className="button_primary button_green border_shadowed"
                            onClick={startGame}
                            disabled={socket?.id !== game?.host}
                            data-title={startButtonTooltip}
                        >
                            <img src="/icons/play.svg" alt="" className="border_shadowed" />
                            <span className="border_shadowed">
                                START
                            </span>
                        </button>
                        <br/>

                        {/* Share */}
                        <div className="button_primary button_lightbg no_interact" style={{  "padding-right": "0px" }}>
                            <img src="/icons/person.svg" alt="" className="border_shadowed" />
                            <div>
                                <span className="border_shadowed" style={{ "text-wrap": "nowrap" }}>
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

                    {/* Right */}
                    <div className="col players_col">
                        {/* Players */}
                        <div>
                            {/* Title */}
                            <div className="flex flex_center_vertically">
                                <h3 className="border_shadowed">Players</h3>
                                <h4 className={`player_count margin_left_auto${playerCount >= playerMax ? " full border_shadowed" : ""}`}>
                                    {playerCount}/{playerMax}
                                </h4>
                            </div>

                            {/* Spectating */}
                            {game.spectatorCount === 0 ? null :
                                <div className="secondary_text">
                                    {/* Icon */}
                                    <svg className="icon_inline secondary_text" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M480.18-303q73.82 0 125.32-51.68 51.5-51.67 51.5-125.5 0-73.82-51.68-125.32-51.67-51.5-125.5-51.5-73.82 0-125.32 51.68-51.5 51.67-51.5 125.5 0 73.82 51.68 125.32 51.67 51.5 125.5 51.5Zm-.12-101q-31.64 0-53.85-22.15T404-479.94q0-31.64 22.15-53.85T479.94-556q31.64 0 53.85 22.15T556-480.06q0 31.64-22.15 53.85T480.06-404ZM480-149q-159.6 0-288.3-92Q63-333 3-480q60-147 188.7-239T480-811q159.6 0 288.3 92Q897-627 957-480q-60 147-188.7 239T480-149Zm0-331Zm.09 218q111.91 0 206.7-59.04Q781.58-380.08 833-480q-51.42-99.92-146.3-158.96Q591.82-698 479.91-698t-206.7 59.04Q178.42-579.92 127-480q51.42 99.92 146.3 158.96Q368.18-262 480.09-262Z"/></svg>

                                    {/* Count */}
                                    {game.spectatorCount} spectator{game.spectatorCount===1?"":"s"}

                                    <br/>
                                    <br/>
                                </div>
                            }

                            {/* List */}
                            <div className="users_list">
                                {Object.entries(game.usersParsed).map(([, user], index) => {
                                    return <User
                                        key={index} user={user} game={game}
                                        title={`ID: ${user.socketID}
                                        ${user.socketID === game.host ? " (Host)":""}`}
                                    />
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Options */}
            <div id="config" className="container">
                {/* Lobby */}
                <section>
                    <h4 className="center fancy_title">
                        <span>Room Options</span>
                    </h4>
                    <Config name="public_lobby" game={game} />
                    <Config name="spectators" game={game} />
                    <Config name="enable_chat" game={game} />
                </section>

                {/* Game */}
                <section>
                    <h4 className="center fancy_title">
                        <span>Modifiers</span>
                    </h4>
                    <Config name="starting_deck" game={game} />
                    <Config name="starting_cards" game={game} />
                    <Config name="draw_stacking" game={game} />
                    <Config name="xray" game={game} />
                    <Config name="infinite_draw" game={game} />
                    <Config name="always_play" game={game} />
                    {/* <Config name="continue" game={game} disabled={true} /> */}
                </section>
            </div>
        </>
    )
}
