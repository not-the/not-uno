import { useEffect, useState } from "react"
import { isProduction, socket } from "../socket"

import LobbyListing from "./LobbyListing"

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
            setServerInfo(response.joinableLobbies.length !== 0 ? response : false);
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
                            <p className="center secondary_text">No public lobbies open</p>
                            :
                            serverInfo.joinableLobbies.map(lobby => <LobbyListing lobby={lobby} joinRoom={joinRoom} />)
                        }
                    </div>

                    {/* Bottom */}
                    <div className="bottom_bar secondary_text">
                        {serverInfo?.online_users ?? 0} player{serverInfo?.online_users !== 1 ? "s" : ""} online
                    </div>
                </div>
                <br/>
                
                {/* More */}
                <div className="flex media_flex gap_12px">
                    {/* Open deck builder */}
                    {isProduction ? null :
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