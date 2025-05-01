import { useState, useEffect } from 'react'
import Home from './components/Home.js'
import Lobby from './components/Lobby.js'
import Game from './components/Game.js'
import Help from './components/Help.js'
import Toast from './components/Toast.js'
import Chat from './components/Chat.js'
import ProfileMenu from './components/ProfileMenu.js'
import { get, store, arrRandom, capitalizeFirstLetter, clearURLHash } from './Util.js'

// Socket.io
import { socket, isProduction, socketConnectionStatus, serverURL } from './socket.js'
import Header from './components/Header.js'
import DeckEditor from './components/DeckEditor.js'

// Game
const appdataURL = serverURL + '/data.json';
let clientData = get(appdataURL);

// data.json fetch failed
if(clientData === undefined) {
    console.warn("data.json fetch failed. Details above.");
    clientData = {};
}

export { clientData };

/** App */
export default function App() {

    // Game
    const [game, setGame] = useState(false);
    const [profile, setProfile] = useState({ name:"username", avatar:"balloon" });

    /** Emits start_game event */
    function startGame() {
        if(isProduction && Object.keys(game.usersParsed).length === 1) {
            if(!window.confirm("You are the only player in the lobby. Start anyway?")) return;
        }
        socket.emit("start_game");
    }

    /** Emits leave event */
    function leaveGame() {
        socket.emit("leave");
    }

    const setUser = (name=profile.name, avatar=profile.avatar) => {
        socket.emit("setUser", { name, avatar });
    }

    function joinRoom(roomID, spectate=false) {
        if(roomID === '') roomID = undefined;
        
        // Rejoin key
        const rejoin_key = localStorage.getItem("notuno_rejoin_key");

        // Emit
        socket.emit("join", { roomID, spectate, rejoin_key });

        // Update UI
        setMenu("joining");

        // Mark existing chatCache as old
        // setChatCache(old => old.map(c => {
        //     c.old_msg = true;
        //     return c;
        // }));
    }

    function debugDataRequest() {
        socket.emit("debug", true);
    }

    const [toasts, setToasts] = useState([]);
    function toast(data) {
        const id = Math.floor(Math.random() * 100000);
        setToasts(old => [...old, {...data, id}]); // Push new toast

        // Timer
        // Animation
        setTimeout(() => {
            // Remove toast
            setToasts(old => {
                let index = old.findIndex(t => t.id === id);
                return old.toSpliced(index, 1);
            });
        }, 6000);
    }

    // Menu {String}
    const [menu, setMenu] = useState(
        window.location.hash.substring(1).length !== 0 ? "joining" : "null"
    );
    const page =
        // Game
        menu === "game" ? <Game game={game} setGame={setGame} startGame={startGame} /> :
        // Lobby
        menu === "lobby" ? <Lobby game={game} setGame={setGame} startGame={startGame} leaveGame={leaveGame} toast={toast} /> :
        // Joining...
        menu === "joining" ? <Joining game={game} setMenu={setMenu} /> :
        // Deck editor
        menu === "deck_editor" ? <DeckEditor setMenu={setMenu} toast={toast} /> :
        // Help
        menu === "help" ? <Help setMenu={setMenu} /> :
        // Home
        <Home setMenu={setMenu} joinRoom={joinRoom} />; // Home

    const [profileOpen, setProfileOpen] = useState(false);

    function getRandomName() {
        const adjective = capitalizeFirstLetter(arrRandom(clientData.names.adjectives));
        const noun = arrRandom(clientData.names.nouns);
        return `${adjective} ${noun}`;
    }

    // Server communication
    useEffect(() => {

        // Joined to room
        socket.on("joined", (data) => {
            const { roomID, rejoin_key } = data;

            // Store rejoin key
            localStorage.setItem("notuno_rejoin_key", rejoin_key);

            // Left
            if(!roomID) {
                setMenu("home");
                clearURLHash();
                return;
            }

            // Update URL
            window.location.hash = `#${roomID}`;
        });

        // Join failed
        socket.on("join_failed", () => {
            setMenu("home");
            clearURLHash();
        })

        // Leave
        socket.on("leave", () => {
            gameStateHandler(false);
        })

        // Toast notification
        socket.on("toast", (data) => {
            toast(data);
        });

        socket.on("gameState", gameStateHandler);
        function gameStateHandler(data) {
            // State
            setGame(o => data);

            // Set menu
            if(data === false) {
                setMenu(null);
                clearURLHash();
                localStorage.removeItem("notuno_rejoin_key");
            }
            else if(data.state === 'lobby') setMenu("lobby");
            else setMenu("game");
        }

        socket.on("myProfile", data => {
            store("user_data", data);
            setProfile(data);
        })

        // Receive debug data
        socket.on("debug", data => {
            for(const [key, value] of Object.entries(data)) {
                console.log(key);
                console.log(value);
            }
        })

        // socket.on("request_custom_deck", () => {
        //     let custom0 = localStorage.getItem("nu_custom_0");
        //     if(custom0 !== undefined) {
        //         socket.emit("custom_deck", JSON.parse(custom0));
        //     }
        // })

        // Debug
        // if(!isProduction) {
        //     document.addEventListener("mousemove", mousemoveHandler);
        // }
        // function mousemoveHandler(event) {
        //     window.mouse = { x:event.x, y:event.y };
        //     const insight = document.getElementById("insight");
        //     if(!insight) return;

        //     requestAnimationFrame(() => {
        //         insight.style.setProperty("--x", `${window.mouse.x}px`);
        //         insight.style.setProperty("--y", `${window.mouse.y}px`);
        //     })
        // }

        // Unmount
        return () => {
            socket.off("join");
            socket.off("join_failed");
            socket.off("toast");
            socket.off("gameState");
            socket.off("myProfile");

            socket.off("debug");
            socket.off("request_custom_deck");

            // if(!isProduction) {
            //     document.removeEventListener("mousemove", mousemoveHandler);
            // }
        }
    }, []);

    return (
        <>
            {/* Header */}
            {menu !== "game" /*&& menu !== "deck_editor"*/ ?
                <Header />
                : null
            }

            {/* Main Content (Home/Lobby/Game/etc.) */}
            {page}

            {/* Chat */}
            <Chat game={game} profile={profile} setUser={setUser} setProfileOpen={setProfileOpen} />

            {/* Background layer */}
            <div id="main_background"/>

            {/* Backdrop */}
            <div className="backdrop"/>

            {/* Profile dialog */}
            {profileOpen ?
                <ProfileMenu profile={profile} getRandomName={getRandomName} setUser={setUser} setProfileOpen={setProfileOpen} />
                : null
            }

            

            {/* Toasts */}
            <div id="toasts">
                {/* Connection lost */}
                {
                    socketConnectionStatus && Object.keys(clientData).length !== 0 ? null :
                    <Toast
                        data={{ title:"⚠ Disconnected", msg:"The server couldn't be reached" } }
                        timed={false} classes="connection_lost_toast"
                        afterJSX={<div>
                            <br/>
                            <a href="https://notkal.com/#contact" target="_blank" rel="noreferrer" className="button button_primary button_secondary button_support border_shadowed">
                                Report a problem
                            </a>
                            <br/>
                            <button className="button button_primary button_secondary button_transparent hover_border_shadowed" onClick={() => window.location.reload()}>
                                Reload
                            </button>
                        </div>}
                    />
                }

                {/* Spectating */}
                {
                    game.my_spectating ?
                    <Toast
                        data={{
                            title:null
                        }}
                        timed={false}
                        interactive={true}
                        classes="spectating_toast"
                        afterJSX={
                            <div>
                                {/* Desc */}
                                <h5>
                                    Spectating...
                                </h5>

                                {/* Buttons */}
                                <div className="flex flex_center_vertically gap_12px">
                                    <button className="button_primary button_secondary button_transparent hover_border_shadowed" onClick={leaveGame}>
                                        Leave
                                    </button>
                                    <button className="button_primary button_secondary button_transparent hover_border_shadowed" onClick={() => joinRoom(game.roomID)} disabled={game.state !== "lobby" || game.isFull}>
                                        Join -&gt;
                                    </button>
                                </div>
                            </div>
                        }
                    />
                    : null
                }

                {/* Notifications */}
                {toasts.map((t, index) => <Toast data={t} key={t.id} timed={t.timed} />)}
            </div>

            {/* Debug tools */}
            {!isProduction ? <>
                <div className="debug_panel">
                    <h4>Debug</h4>
                    <table>
                        <tr>
                            <th>Server</th>
                            <td>{JSON.stringify(socketConnectionStatus)}</td>
                        </tr>
                        <tr>
                            <th>socketID</th>
                            <td>{socket?.id}</td>
                        </tr>
                        <tr>
                            <th>my_num</th>
                            <td>{game?.my_num}</td>
                        </tr>
                        <tr>
                            <th>my_spectating</th>
                            <td>{String(game.my_spectating)}</td>
                        </tr>
                        <tr>
                            <th>Deck size</th>
                            <td>{String(game?.deck?.length)}</td>
                        </tr>
                    </table>
                    <br/>

                    <button onClick={debugDataRequest} className="pointer_events_all hover_underline">Request server data (console)</button><br/>
                    <button onClick={() => console.log(game)} className="pointer_events_all hover_underline">Game object (console)</button>
                </div>

                {/* Insight debug tooltip */}
                {/* <div id="insight">
                    Card information goes here
                </div> */}
            </> : null}
        </>
    );
}


function Joining({ game, setMenu }) {
    return (
        <div className="container">
            <h2 className="border_shadowed">Joining...</h2>
            <br/>

            <button
                className="button_primary button_secondary button_lightbg hover_border_shadowed"
                onClick={() => setMenu(false)}
            >
                Cancel
            </button>
        </div>
    )
}
