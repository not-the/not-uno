import { useEffect } from "react";
import User from "./User"

export default function Chat({
    game,
    chatOpen, setChatOpen,
    profile, setUser,
    chatCache,
    chatInput, setChatInput,
    sendChat,
    setProfileOpen
}) {
    return (
        <div id="chat" className="border_shadowed">
            {/* Close button */}
            <button className="close" data-title="Close" onClick={() => setChatOpen(false)}>
                &lt;
            </button>

            {/* Chat */}
            <h3 className="border_shadowed cursor_pointer" onClick={() => setChatOpen(false)}>Chat</h3>

            {/* Edit profile */}
            <button className="profile_button button_comp fullwidth" onClick={() => setProfileOpen(true)}>
                <User user={profile} tagline={"Click to customize..."} />
            </button>

            <hr />

            <div className="chat_messages">
                {
                    // Not in-game
                    game === false ?
                    <div className="chat_unavailable secondary_text">
                        Start or join a game
                    </div> :

                    // Chat is disabled
                    !game?.config?.enable_chat ?
                    <div className="chat_unavailable secondary_text">
                        Chat is disabled
                    </div> :

                    // Messages
                    chatCache.map((data, index) => 
                        <User
                            user={
                                data.user === "system" ? "system" : game.usersParsed[data.socketID]
                            }
                            tagline={data.msg}
                            classes={
                                "msg" +
                                (data.clump ? " clump" : "") +
                                (data.old_msg ? " old_msg" : "") // +
                                // (index === 0 ? " msg_in" : "")
                            }
                            key={chatCache - index - 1}
                        />)
                }
            </div>

            <div className="chat_bottom" aria-disabled={!game?.config?.enable_chat}>
                <input type="text" name="chat_input" id="chat_input"
                    placeholder="Send a message..."
                    onChange={event => setChatInput(event.target.value)}
                    onKeyDown={event => { if(event.key === "Enter") sendChat() }}
                    disabled={!game?.config?.enable_chat}
                />
                <button
                    onClick={sendChat}
                    className={
                        (game !== false && chatInput.length > 0) ? "message_ready" : null
                    }
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22.498" height="22.749" viewBox="0 0 22.498 22.749">
                        <path id="Send" d="M1,22.749a1.016,1.016,0,0,1-.7-.283.992.992,0,0,1-.3-.719v-.511L2.843,13.4,10.8,11.866a.5.5,0,0,0,0-.982L2.843,9.353,0,1.513V1A1,1,0,0,1,1.452.109l20.5,10.373a1,1,0,0,1,0,1.785L1.452,22.64A.985.985,0,0,1,1,22.749Z" fill="#fff"/>
                    </svg>
                </button>
            </div>
        </div>
    )
}