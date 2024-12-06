import { useState, useEffect } from 'react'
import Home from './components/Home.js'
import Lobby from './components/Lobby.js'
import Game from './components/Game.js'
import Toast from './components/Toast.js'
import Chat from './components/Chat.js'
import ProfileMenu from './components/ProfileMenu.js'
import { get, store, arrRandom, capitalizeFirstLetter } from './Util.js'

// Socket.io
import { socket, isProduction, socketConnectionStatus, serverURL } from './socket.js'
import Header from './components/Header.js'
import DeckEditor from './components/DeckEditor.js'

// Game
const appdataURL = serverURL + '/data.json';
const clientData = get(appdataURL);

export { clientData };

/** App */
export default function App() {

    // Game
    const [game, setGame] = useState(false);
    const [profile, setProfile] = useState({ name:"username", avatar:"balloon" });
    // const [users, setUsers] = useState({});

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

    // Chat
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState("");


    const [chatUnread, setChatUnread] = useState(0);

    const [chatCache, setChatCache] = useState([]);
    const [chatBubble, setChatBubble] = useState(undefined);

    let chatBubbleTimeout;
    let removeChatBubbleTimeout;
    function newChatMsg(data) {
        setChatCache(old => {
            let newArr = [data, ...old];

            // Clump messages from same user together
            for(let i in newArr) {
                const item = newArr[i];
                const prev = newArr[i - 1];
                if(item?.socketID === prev?.socketID && prev !== undefined) prev.clump = true;
            }

            return newArr;
        }); // Push new message

        // Bubble
        const isChatOpenByClass = document.querySelector(".chat_container").classList.contains("open");
        if(!isChatOpenByClass) {
            setChatBubble(data);
            setChatUnread(old => old+1);

            // Timer
            clearTimeout(chatBubbleTimeout);
            clearTimeout(removeChatBubbleTimeout);
            chatBubbleTimeout = setTimeout(() => {
                setChatBubble(old => ({...old, bubble_timed_out:true}));
            }, 6000);
            removeChatBubbleTimeout = setTimeout(() => {
                setChatBubble(undefined);
            }, 6300);
        }
    }

    function toggleChat() {
        // Clear bubble
        setChatBubble(undefined);
        setChatUnread(0);

        setChatOpen(old => {
            // Opening
            if(!old) {
                document.getElementById("chat_input").focus();
            }

            return !old;
        });
    }

    const sendChat = () => {
        if(game === false) return;

        socket.emit("chat", { msg:chatInput });
        // newChatMsg(chatInput);
        setChatInput("");
        document.getElementById("chat_input").value = "";
    }

    const setUser = (name=profile.name, avatar=profile.avatar) => {
        socket.emit("setUser", { name, avatar });
    }

    function joinRoom(roomID, spectate=false) {
        if(roomID === '') roomID = undefined;

        socket.emit("join", { roomID, spectate });
        setMenu("joining");

        // Mark existing chatCache as old
        setChatCache(old => old.map(c => {
            c.old_msg = true;
            return c;
        }));
    }

    function debugDataRequest() {
        socket.emit("debug", true);
    }

    const [toasts, setToasts] = useState([]);
    function toast(data) {
        setToasts(old => [...old, data]); // Push new toast

        // Timer
        // Animation
        setTimeout(() => {
            setToasts(old => {
                let index = old.indexOf(data);
                return old.toSpliced(index, 1);
            }); // Remove toast
        }, 6000);

        // Remove
        // setTimeout(() => {
        //     setToasts(old => {
        //         let index = old.indexOf(data);
        //         return old.splice(index, 1);
        //     }); // Remove toast
        // }, 6200);
    }

    // Menu {String}
    const [menu, setMenu] = useState("null");
    const page =
        // Game
        menu === "game" ? <Game game={game} setGame={setGame} startGame={startGame} /> :
        // Lobby
        menu === "lobby" ? <Lobby game={game} setGame={setGame} startGame={startGame} leaveGame={leaveGame} toast={toast} /> :
        // Joining...
        menu === "joining" ? <Joining game={game} setMenu={setMenu} /> :
        // Deck editor
        menu === "deck_editor" ? <DeckEditor setMenu={setMenu} toast={toast} /> :
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
        // Auto join from URL
        if(window.location.hash !== '') joinRoom(window.location.hash.substring(1));

        // Pre-existing username
        let myUser = store("user_data") ?? { name: getRandomName() };
        socket.emit("setUser", myUser);

        // Receive MSG
        socket.on("chat_receive", data => {
            newChatMsg(data);
        });

        // Joined to room
        socket.on("joined", roomID => {
            // Left
            if(!roomID) {
                setMenu("home");
                window.location.hash = '';
                return;
            }

            if(window.location.hash === '') window.location.hash = `#${roomID}`;
        });

        // Join failed
        socket.on("join_failed", () => {
            setMenu("home");
            window.location.hash = '';
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
                window.location.hash = "";
            }
            else if(data.state === 'lobby') setMenu("lobby");
            else setMenu("game");
        }

        socket.on("assignedUserData", data => {
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
            socket.off("chat_receive");
            socket.off("join");
            socket.off("join_failed");
            socket.off("toast");
            socket.off("gameState");
            socket.off("assignedUserData");

            socket.off("debug");
            socket.off("request_custom_deck");

            window.location.hash = '';

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
            <div className={`chat_container ${chatOpen ? "open" : null}`}>
                <Chat
                    game={game}
                    chatOpen={chatOpen} setChatOpen={setChatOpen}
                    profile={profile} setUser={setUser}
                    chatCache={chatCache}
                    chatInput={chatInput} setChatInput={setChatInput}
                    sendChat={sendChat}
                    setProfileOpen={setProfileOpen}
                />
                <button id="chat_button" className="border_shadowed" onClick={toggleChat}>
                    <img src="/icons/chat.svg" alt="Chat" />
                    <span>{chatUnread > 9 ? "9+" : chatUnread || null}</span>

                    {/* Bubble */}
                    {chatBubble ?
                        <div className="bubble" data-expired={chatBubble.bubble_timed_out}>
                            <div className="inner">
                                <strong>{chatBubble.user.name}</strong>
                                <span>{chatBubble.msg}</span>
                            </div>
                        </div>
                        : null
                    }

                </button>
            </div>

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
                    socketConnectionStatus ? null :
                    <Toast data={{ title:"⚠ Disconnected", msg:"Can't reach server" } } timed={false} classes="connection_lost" />
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
                {toasts.map((t, index) => <Toast data={t} key={index} timed={t.timed} />)}
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
