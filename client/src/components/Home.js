import { useEffect, useState } from "react"
import { socket } from "../socket";
import { capitalizeFirstLetter } from "../Util";
import lang from "../lang";

export default function Home({ setMenu, joinRoom }) {
    const [lobbies, setLobbies] = useState(undefined);
    const [lobbyListFetched, setLobbyListFetched] = useState(false);

    const refreshButton = <div className="refresh_container margin_left_auto" data-list-fetched={lobbyListFetched}>
        {/* // Loader */}
        <img src="/icons/Loader.svg" alt="Waiting..." className="loader_spin" />

        {/* // Button */}
        <button className="button_primary button_secondary button_mini button_mainbg button_border_bg_lighter hover_border_shadowed position_relative" onClick={requestLobbies}>Refresh</button>
    </div>

    function requestLobbies() {
        setLobbyListFetched(false);
        socket.emit("request_public_lobbies");
    }

    useEffect(() => {
        // Request lobbies
        requestLobbies();

        let refreshLoop = setInterval(requestLobbies, 6000);

        // Recieve lobbies
        socket.on("lobby_list", list => {
            setLobbies(list.length !== 0 ? list : false);
            setLobbyListFetched(true);

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
                        {!lobbies ?
                        <p className="center secondary_text">
                            No public lobbies open
                        </p>
                            :
                        lobbies.map(lobby => {
                            let modeInfo = lang.en?.[lobby?.config?.starting_deck] ?? lobby?.config?.starting_deck;

                            if(lobby?.config?.xray) {
                                if(modeInfo === "Normal") modeInfo = "Hands Down";
                                else modeInfo += ", Hands Down";
                            }

                            const host = lobby?.usersParsed[lobby?.host];

                            return (
                                <div
                                    className="lobby flex gap_12px hover_border_shadowed"
                                    role="button" tabIndex="0"
                                    onClick={() => joinRoom(lobby.roomID)}
                                >
                                    {/* Icon */}
                                    <img src={`/avatars/${host?.avatar}.png`} alt="" className="avatar" />

                                    {/* Right */}
                                    <div className="fullwidth">
                                        <div className="flex">
                                            <strong>
                                                {lobby.roomID}
                                            </strong>
                                            <div className="margin_left_auto">
                                                Mode: <b>{modeInfo}</b>
                                            </div>
                                        </div>
                                        <div className="flex secondary_text">
                                            <p>
                                                Host: <b>{host?.name}</b>
                                            </p>
                                            <p className="margin_left_auto">
                                                Players: {Object.keys(lobby?.usersParsed??{}).length}/4
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <br/>
                
                {/* More */}
                <div className="flex media_flex gap_12px">
                    {/* <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed" onClick={() => setMenu("deck_editor")}>
                        Custom deck editor
                    </button> */}
                    {/* <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed">
                        Placeholder
                    </button> */}
                </div>

                <br/>
                <br/>
                <p className="secondary_text center">Play UNO online with friends!</p>

            </main>
        </>
    )
}