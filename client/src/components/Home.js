import { useEffect, useState } from "react"
import { isProduction, socket, socketConnectionStatus } from "../socket"

import LobbyListing from "./LobbyListing"

export default function Home({ setMenu, joinRoom }) {
    const [serverInfo, setServerInfo] = useState(undefined);
    const [isLobbyListFetched, setIsLobbyListFetched] = useState(false);

    const refreshButton = <div className="refresh_container margin_left_auto" data-list-fetched={isLobbyListFetched}>
        {/* // Loader */}
        <img src="/icons/Loader.svg" alt="Waiting..." className="loader_spin" />

        {/* // Button */}
        <button
            className="button_primary button_secondary button_mini button_mainbg button_border_bg_lighter hover_border_shadowed position_relative"
            onClick={requestLobbies}
        >
            Refresh
        </button>
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
        socket.on("lobby_list", (response={}) => {
            setServerInfo(response);
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
                        {/* Public lobbies */}
                        {serverInfo === undefined || serverInfo?.publicLobbies?.length === 0 ?
                            <p className="center secondary_text">No public lobbies open</p>
                            :
                            serverInfo?.publicLobbies?.map?.(lobby => <LobbyListing lobby={lobby} joinRoom={joinRoom} key={lobby.roomID} />)
                        }

                        {/* Local network lobbies */}
                        {serverInfo === undefined || serverInfo?.localNetworkLobbies?.length === 0 ? null :
                            <div className="lobbies_header" style={{ paddingBottom:"3px" }}>
                                <h5 className="no_margin" style={{ color:"var(--bg-lighter)", marginTop: "24px" }}>
                                    Local network
                                </h5>
                            </div>
                        }
                        {serverInfo?.localNetworkLobbies?.map?.(lobby => <LobbyListing lobby={lobby} joinRoom={joinRoom} key={lobby.roomID} classes="local_network" />)}
                    </div>

                    {/* Bottom */}
                    <div className="bottom_bar secondary_text flex media_flex" style={{ alignItems:"end" }}>
                        {/* Status */}
                        <div>
                            {/* Indicator */}
                            <div id="connection_indicator" aria-checked={socketConnectionStatus} />

                            {/* Player count */}
                            {socketConnectionStatus === true ?
                                `${serverInfo?.online_users} player${serverInfo?.online_users !== 1 ? "s" : ""} online`
                                :
                                "Server offline"
                            }
                        </div>

                        {/* Offline blurb */}
                        {socketConnectionStatus === true ? null :
                            <div className="margin_left_auto">
                                <div className="offline_blurb flex gap_12px">
                                    <a href="https://notkal.com/#contact" target="_blank" rel="noreferrer" className="button button_primary button_secondary button_support hover_border_shadowed button_mini">
                                        Report a problem
                                    </a>
                                    <button className="button button_primary button_secondary button_transparent hover_border_shadowed button_mini" onClick={() => window.location.reload()}>
                                        Reload
                                    </button>
                                </div>
                            </div>
                        }
                    </div>
                </div>
                <br/>
                
                {/* More */}
                <footer id="footer" className="flex media_flex gap_12px flex_center_horizontally">
                    {/* Open deck builder */}
                    {isProduction ? null :
                        <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed button_mini" onClick={() => setMenu("deck_editor")}>
                            Custom Deck Builder (WIP)
                        </button>
                    }

                    {/* Tutorial */}
                    <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed button_mini" onClick={() => setMenu("help")}>
                        <span>?</span>
                        How to play
                    </button>

                    {/* Changelog */}
                    <a href="https://notkal.com/posts/not-uno-changelog" target="_blank" rel="noreferrer"
                        className="button button_primary button_secondary button_mainbg hover_border_shadowed button_border_bg_lighter button_mini"
                    >
                        <span>Changelog</span>
                    </a>
                </footer>

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