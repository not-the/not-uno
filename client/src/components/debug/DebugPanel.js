import { useEffect, useState } from "react";
// import User from "./User"
import { isProduction, socket, socketConnectionStatus } from "../../socket";
import { clientData } from "../../App";
import DebugLobbyListing from "./DebugLobbyListing";
import { formattedDate } from "../../Util";

export default function DebugPanel({ game, joinRoom }) {
    // State
    const [debugOpen, setDebugOpen] = useState(false);
    const [lobbies, setLobbies] = useState({});
    const [waitingForLobbies, setWaitingForLobbies] = useState(false);

    // Toggle
    function toggleDebug() {
        setDebugOpen(old => !old);
    }

    /** Request server data */
    function debugDataRequest() {
        socket.emit("debug", true);
    }

    /** Request lobby list */
    function debugRequestLobbies() {
        setWaitingForLobbies(true);
        socket.emit("debug_request_lobbies");
    }

    // Effects
    useEffect(() => {
        // Get Lobby list
        socket.on("debug_request_lobbies", (response) => {
            setLobbies(response);
            setWaitingForLobbies(false);
        });

        let refreshLoop = setInterval(() => {
            const isDebugOpenByClass = document.querySelector(".debug_container").classList.contains("open");
            if(!isDebugOpenByClass) return;
            debugRequestLobbies();
        }, 1000);

        // Cleanup
        return () => {
            socket.off("debug_request_lobbies");

            clearInterval(refreshLoop);
        }
    }, [])

    return (<>

        <div className={`panel_container debug_container ${debugOpen ? "open" : ""}`}>

            {/* Debug panel */}
            <div id="debug" className="panel">

                {/* Close button */}
                <button className="close" data-title="Close" onClick={() => setDebugOpen(false)}>
                    &gt;
                </button>

                {/* Title */}
                <h3 className="border_shadowed cursor_pointer" onClick={() => setDebugOpen(false)}>
                    Debug
                </h3>

                {/* Debug tools */}
                <details>
                    <summary>Client state</summary>
                    <div className="inner">
                        <table>
                            <tr>
                                <th>socketConnectionStatus</th>
                                <td>{JSON.stringify(socketConnectionStatus)}</td>
                            </tr>
                            <tr>
                                <th>socket.id</th>
                                <td>{socket?.id}</td>
                            </tr>
                            <tr>
                                <th>game.my_num</th>
                                <td>{game?.my_num}</td>
                            </tr>
                            <tr>
                                <th>game.my_spectating</th>
                                <td>{String(game.my_spectating)}</td>
                            </tr>
                            <tr>
                                <th>game.deck.length</th>
                                <td>{String(game?.deck?.length)}</td>
                            </tr>
                        </table>


                        {/* Insight debug tooltip */}
                        {/* <div id="insight">
                            Card information goes here
                        </div> */}
                    </div>
                </details>

                <br/>
                <hr/>
                <br/>

                <h5>Server</h5>
                <button onClick={debugDataRequest} className="pointer_events_all hover_underline">
                    Request server data (console)
                </button>
                <button onClick={() => console.log(game)} className="pointer_events_all hover_underline">
                    Game object (console)
                </button>

                {/* Server log */}
                <details>
                    <summary>Server log</summary>
                    <div className="inner debug_log smaller">
                        <br/>

                        {/* Unique keys needed */}
                        {[ ...(lobbies?.serverLogHistory ?? []) ].reverse().map(entry => {
                            return <div className="item" style={{ lineHeight:"1.9" }} key={entry.timestamp}>
                                <span className="debug_block secondary_text" style={{ display:"inline" }}>
                                    {formattedDate(new Date(entry.timestamp))}
                                </span>
                                <span className="text" style={{ whiteSpace:"pre" }}>
                                    {/* Remove console formatting codes */}
                                    {entry.cleanMessage}
                                </span>
                            </div>
                        })}
                        <br/>
                    </div>
                </details>
                <br/>
                <hr/>
                <br/>

                {/* Lobbies */}
                <div className="flex gap_6px" style={{ alignItems:"flex-end" }}>
                    <h5>Rooms</h5>
                    {/* <button
                        className="button button_primary button_secondary button_transparent button_micro hover_border_shadowed margin_left_auto"
                        onClick={debugRequestLobbies}
                        aria-disabled={waitingForLobbies}
                    >
                        Pause
                    </button> */}
                    <button
                        className="button button_primary button_secondary button_transparent button_mini hover_border_shadowed margin_left_auto"
                        onClick={debugRequestLobbies}
                        aria-disabled={waitingForLobbies}
                    >
                        Refresh
                    </button>
                </div>
                
                {/* Open */}
                <div className="debug_lobbies">
                    {/* DEBUG - ALL LOBBIES */}
                    {lobbies?.open?.map?.(lobby => <DebugLobbyListing
                        lobby={lobby}
                        joinRoom={joinRoom}
                        key={lobby.roomID}
                        game={game}
                    />)}

                    {/* No lobbies found */}
                    {lobbies?.open?.length !== 0 ? null :
                        <div className="secondary_text smaller">No rooms found</div>
                    }
                </div>

                <br/>

                {/* Closed */}
                <h5>Closed</h5>
                <div className="debug_lobbies">
                    {/* DEBUG - ALL LOBBIES */}
                    {lobbies?.closed?.map?.(lobby => <DebugLobbyListing
                        lobby={lobby}
                        joinRoom={joinRoom}
                        key={lobby.roomID}
                        game={game}
                    />)}
                    {/* No lobbies found */}
                    {lobbies?.closed?.length !== 0 ? null :
                        <div className="secondary_text smaller">No closed rooms found</div>
                    }
                </div>

            </div>


            {/* Button */}
            <button id="debug_button" className="border_shadowed" onClick={toggleDebug}>
                <img src="/icons/Magnify.svg" alt="Open Debug Panel" />
            </button>
        </div>
    </>)
}