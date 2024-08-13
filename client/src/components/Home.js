import { useEffect, useState } from "react"
import { socket } from "../socket";
import { capitalizeFirstLetter } from "../Util";

export default function Home({ joinRoom }) {
    const [lobbies, setLobbies] = useState(undefined);

    const refreshButton = lobbies === undefined ?
        // Loader
        <img src="/icons/Loader.svg" alt="Waiting..." className="loader_spin margin_left_auto" />
        // Button
        : <button className="margin_left_auto button_primary button_secondary button_mini button_mainbg hover_border_shadowed" onClick={requestLobbies}>Refresh</button>

    function requestLobbies() {
        setLobbies(undefined);
        socket.emit("request_public_lobbies");
    }

    useEffect(() => {
        // Request lobbies
        requestLobbies();

        // Recieve lobbies
        socket.on("lobby_list", list => setLobbies(list.length !== 0 ? list : false));

        // Unmount
        return () => {
            socket.off("lobby_list");
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
                            let modeInfo = capitalizeFirstLetter(lobby?.config?.starting_deck);

                            if(lobby?.config?.xray) {
                                if(modeInfo === "Normal") modeInfo = "Hands Down";
                                else modeInfo += " / Hands Down";
                            }

                            return (
                                <div
                                    className="lobby hover_border_shadowed"
                                    role="button" tabIndex="0"
                                    onClick={() => joinRoom(lobby.roomID)}
                                >
                                    <div className="flex">
                                        <strong>
                                            {lobby.roomID}
                                        </strong>
                                        <div className="margin_left_auto">
                                            Mode: <b>{modeInfo}</b>
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <p className="secondary_text">
                                            Players: {Object.keys(lobby?.usersParsed??{}).length}/4
                                        </p>
                                        <p className="margin_left_auto secondary_text">
                                            Hosted by <b>{lobby?.usersParsed[lobby?.host]?.name}</b>
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </main>
        </>
    )
}