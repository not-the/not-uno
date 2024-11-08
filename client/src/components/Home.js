import { useEffect, useState } from "react"
import { isProduction, socket } from "../socket";
import { capitalizeFirstLetter } from "../Util";
import lang from "../lang";

export default function Home({ setMenu, joinRoom }) {
    const [serverInfo, setServerInfo] = useState(undefined);
    const [isLobbyListFetched, setIsLobbyListFetched] = useState(false);

    const refreshButton = <div className="refresh_container margin_left_auto" data-list-fetched={isLobbyListFetched}>
        {/* // Loader */}
        <img src="/icons/Loader.svg" alt="Waiting..." className="loader_spin" />

        {/* // Button */}
        <button className="button_primary button_secondary button_mini button_mainbg button_border_bg_lighter hover_border_shadowed position_relative" onClick={requestLobbies}>Refresh</button>
    </div>

    function requestLobbies() {
        setIsLobbyListFetched(false);
        socket.emit("request_public_lobbies");
    }

    useEffect(() => {
        // Request lobbies
        requestLobbies();

        let refreshLoop = setInterval(requestLobbies, 6000);

        // Recieve lobbies
        socket.on("lobby_list", response => {
            setServerInfo(response.publicLobbies.length !== 0 ? response : false);
            setIsLobbyListFetched(true);

            // Restart loop
            clearInterval(refreshLoop);
            refreshLoop = setInterval(requestLobbies, 6000);
        });

        // Unmount
        return () => {
            socket.off("lobby_list");
            clearInterval(refreshLoop);
        }
    }, []);

    return (
        <>
            {/* Main */}
            <main id="home" className="container">
                {/* Create */}
                <h4 className="border_shadowed shadow_distance_0">Play with friends</h4>
                <button className="button_primary border_shadowed" onClick={() => joinRoom(undefined)}>
                    <span className="border_shadowed">
                        CREATE LOBBY
                    </span>
                </button>
                <br/>
                <br/>

                {/* Public */}
                <div className="lobbies_container">
                    <div className="flex flex_center_vertically lobbies_header" style={{minHeight:"47px"}}>
                        <h4 className="border_shadowed no_margin shadow_distance_0">Public lobbies</h4>
                        {refreshButton}
                    </div>

                    {/* List */}
                    <div className="lobbies_list">
                        {!serverInfo ?
                        <p className="center secondary_text">
                            No public lobbies open
                        </p>
                            :
                        serverInfo.publicLobbies.map(lobby => {
                            let modeInfo = lang.en?.[lobby?.config?.starting_deck] ?? lobby?.config?.starting_deck;

                            if(lobby?.config?.xray) {
                                if(modeInfo === "Normal") modeInfo = "Hands Down";
                                else modeInfo += ", Hands Down";
                            }

                            const host = lobby?.usersParsed[lobby?.host];

                            return (
                                <div className="lobby flex gap_12px">
                                    {/* Inner */}
                                    <div
                                        className="lobby_block inner flex gap_12px hover_border_shadowed"
                                        role="button" tabIndex="0"
                                        onClick={() => joinRoom(lobby.roomID)}
                                    >
                                        {/* Icon */}
                                        <img src={`/avatars/${host?.avatar}.png`} alt="" className="avatar" />

                                        {/* Right */}
                                        <div className="fullwidth">
                                            <div className="flex media_flex">
                                                <strong>
                                                    {lobby.roomID}
                                                </strong>
                                                <div className="margin_left_auto">
                                                    Mode: <b>{modeInfo}</b>
                                                </div>
                                            </div>
                                            <div className="flex media_flex secondary_text">
                                                <p>
                                                    Host: <b>{host?.name}</b>
                                                </p>
                                                <p className="margin_left_auto">
                                                    Players: {Object.keys(lobby?.usersParsed??{}).length}/4
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Spectate */}
                                    {!lobby.config.spectators ? null :
                                    <div
                                        className="lobby_block spectate_btn hover_border_shadowed flex flex_center"
                                        title="Spectate"
                                        role="button" tabIndex="0"
                                        onClick={() => joinRoom(lobby.roomID, true)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M480.18-303q73.82 0 125.32-51.68 51.5-51.67 51.5-125.5 0-73.82-51.68-125.32-51.67-51.5-125.5-51.5-73.82 0-125.32 51.68-51.5 51.67-51.5 125.5 0 73.82 51.68 125.32 51.67 51.5 125.5 51.5Zm-.12-101q-31.64 0-53.85-22.15T404-479.94q0-31.64 22.15-53.85T479.94-556q31.64 0 53.85 22.15T556-480.06q0 31.64-22.15 53.85T480.06-404ZM480-149q-159.6 0-288.3-92Q63-333 3-480q60-147 188.7-239T480-811q159.6 0 288.3 92Q897-627 957-480q-60 147-188.7 239T480-149Zm0-331Zm.09 218q111.91 0 206.7-59.04Q781.58-380.08 833-480q-51.42-99.92-146.3-158.96Q591.82-698 479.91-698t-206.7 59.04Q178.42-579.92 127-480q51.42 99.92 146.3 158.96Q368.18-262 480.09-262Z"/></svg>
                                    </div>
                                }
                                </div>
                            )
                        })}
                    </div>

                    {/* Bottom */}
                    {/* <div className="bottom_bar secondary_text">
                        {serverInfo?.online_users ?? 0} player{serverInfo?.online_users !== 1 ? "s" : ""} online
                    </div> */}
                </div>
                <br/>
                
                {/* More */}
                <div className="flex media_flex gap_12px">
                    {/* Open deck builder */}
                    {
                        isProduction ? null :
                        <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed" onClick={() => setMenu("deck_editor")}>
                            Custom Deck Builder (WIP)
                        </button>
                    }
                    {/* <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed">
                        Placeholder
                    </button> */}
                </div>

                <br/>
                <br/>
                <p className="secondary_text center">Play UNO online with friends!</p>
                <br/>
                <br/>
                <br/>
                <br/>

            </main>
        </>
    )
}