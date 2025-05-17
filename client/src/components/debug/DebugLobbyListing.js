import { useState } from "react";

import { formattedDate } from "../../Util";
import lang from "../../lang"

import User from "../User";
import DebugLog from "./DebugLog";


export default function DebugLobbyListing({ lobby, joinRoom, classes, game }) {
    const [inspectOpen, setInspectOpen] = useState(false);

    // Mode string
    let modeInfo = lang.en?.[lobby?.config?.starting_deck] ?? lobby?.config?.starting_deck;
    if(lobby?.config?.xray) {
        if(modeInfo === "Classic") modeInfo = "Hands Down";
        else modeInfo += ", Hands Down";
    }

    // Host socketID
    const host = lobby?.usersParsed[lobby?.host];

    const allClasses = [
        "lobby flex flex_column gap_12px",
        lobby?.config?.public_lobby ? "" : "private",
        classes ?? ""
    ].join(" ");

    /** Inspect */
    function inspect() {
        console.log(lobby);
        setInspectOpen(old => !old);
    }

    const allowJoin = lobby.state === "lobby" && lobby.roomID !== game?.roomID;

    // JSX
    return (
        <div className={allClasses}>

            <div className="flex gap_6px">
                {/* Inspect */}
                <div
                    className="lobby_block spectate_btn hover_border_shadowed flex flex_center"
                    title="Inspect"
                    role="checkbox" tabIndex="0"
                    onClick={() => inspect(lobby)}
                    aria-checked={inspectOpen}
                >
                    <img src="/icons/Magnify.svg" alt="Inspect" class="icon_inline secondary_text" />
                </div>

                {/* Inner */}
                <div
                    className="lobby_block inner flex gap_12px hover_border_shadowed"
                    role="button" tabIndex="0"
                    onClick={() => joinRoom(lobby.roomID, true)}
                >
                    {/* Icon */}
                    {lobby.roomClosed ? null :
                        <img src={`/avatars/${host?.avatar}.png`} alt="" className="avatar" />
                    }

                    {/* Right */}
                    <div className="fullwidth">
                        {/* Upper */}
                        <div className="flex media_flex">
                            <strong>
                                {lobby.roomID}
                            </strong>
                            <div className="margin_left_auto">
                                Mode: <b>{modeInfo}</b>
                            </div>
                        </div>

                        {/* Lower */}
                        <div className="flex media_flex secondary_text">
                            <p>
                            {!lobby.roomClosed ?
                                <>Host: <b>{host?.name}</b></>
                                :
                                <>{new Date(lobby.roomClosedTimestamp).toString().split(" GMT-")[0]}</>
                            }
                            </p>
                            
                            {!lobby.roomClosed ?
                                <p className="margin_left_auto">
                                    Players: {Object.keys(lobby?.usersParsed??{}).length}/{lobby.config.max_players}
                                </p>
                                :
                                null
                            }
                        </div>

                        {/* Debug */}
                        {/* <div className="secondary_text" style={{ paddingTop: "4px" }}>
                            {lobby.state}
                        </div> */}
                    </div>
                </div>

                {/* Join */}
                {
                    allowJoin ?
                    <div
                        className="lobby_block spectate_btn hover_border_shadowed flex flex_center"
                        title="Join lobby"
                        role="button" tabIndex="0"
                        onClick={allowJoin ? () => joinRoom(lobby.roomID) : null}
                        aria-disabled={!allowJoin}
                    >
                        <img src="/icons/Door.svg" alt="Click to join" class="icon_inline secondary_text" />
                    </div>
                    :
                    <div className="spectate_btn flex flex_center">
                        {
                            lobby.roomID === game?.roomID ?
                            (
                                game?.my_spectating ?
                                <img src="/icons/eyeball.svg" alt="You are spectating this room" />
                                :
                                <strong>✓</strong>
                            )
                            :
                            "🎮"
                        }
                    </div>
                }
            </div>


            {/* Details */}
            <details open={inspectOpen}>
                <summary className="display_none">Inspect</summary>

                {/* Inner */}
                <div className="inner">
                    {!inspectOpen ? null : <>

                        {/* Log */}
                        <details>
                            <summary>Log</summary>
                            <div className="inner">
                                <DebugLog lobby={lobby} />
                            </div>
                        </details>
                        <br/>

                        {/* Users */}
                        {/* <h3>Users</h3> */}
                        <div>
                            <p>
                                <span className="secondary_text">Created</span> {formattedDate(new Date(lobby.roomCreatedTimestamp))}
                            </p>
                            {!lobby.roomClosedTimestamp ? null :
                                <p><span className="secondary_text">Closed</span> {formattedDate(new Date(lobby.roomClosedTimestamp))}</p>
                            }
                        </div>
                        <br/>
                        
                        <div className="users_list">
                            {
                                Object.entries(lobby.usersParsed).map(([socketID, value]) => {
                                    return <User user={value} game={lobby} tagline={socketID} />
                                })
                            }
                        </div>
                        <br/>

                        {/* Raw */}
                        <details>
                            <summary>Raw</summary>
                            <div className="inner">
                                <table>
                                    {
                                        Object.entries(lobby).map(([key, value]) => {
                                            const keyBlacklist = ["config", "log"];
                                            if(keyBlacklist.includes(key)) return null;

                                            return <tr>
                                                <th>{key}</th>
                                                <td>{JSON.stringify(value)}</td>
                                            </tr>
                                        })
                                    }
                                </table>
                            </div>
                        </details>

                        {/* Config */}
                        <details>
                            <summary>Config</summary>
                            <div className="inner">
                                <table>
                                    {
                                        Object.entries(lobby.config).map(([key, value]) => {
                                            // Blacklist
                                            const keyBlacklist = [];
                                            if(keyBlacklist.includes(key)) return null;

                                            // localized
                                            const localizedKey = lang.en[key];

                                            return (
                                                <tr>
                                                    <th>
                                                        <span className="table_formal_key">
                                                            {localizedKey ?? key}
                                                        </span>
                                                        <span className="table_hover_key weight_400 secondary_text">
                                                            {key}
                                                        </span>
                                                    </th>
                                                    <td>{String(value)}</td>
                                                </tr>
                                            )
                                        })
                                    }
                                </table>
                            </div>
                        </details>
                    </>}

                </div>
            </details>
            
        </div>
    )
}