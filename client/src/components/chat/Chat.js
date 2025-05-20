import { useEffect, useState } from "react";
import User from "../User"
import { socket } from "../../socket";
import UserAvatar from "../UserAvatar";
import ChatInput from "./ChatInput";

export default function Chat({
    game,
    profile,
    setProfileOpen
}) {
    // Chat
    const [chatOpen, setChatOpen] = useState(false);

    const [chatUnread, setChatUnread] = useState(0);

    const [chatCache, setChatCache] = useState([]);
    const [chatBubble, setChatBubble] = useState(undefined);


    useEffect(() => {
        // Receive MSG
        socket.on("chat_receive", data => {
            newChatMsg(data);
        });

        return () => {
            socket.off("chat_receive");
        }
    }, [])

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


    return (<>

        <div className={`panel_container chat_container ${chatOpen ? "open" : ""}`}>
            <div id="chat" className="panel border_shadowed">

                {/* Close button */}
                <button className="close" data-title="Close" onClick={() => setChatOpen(false)}>
                    &lt;
                </button>

                {/* Title */}
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
                        chatCache.map((data) => 
                            <User
                                user={
                                    data.system ? "system" : game.usersParsed[data.socketID]
                                }
                                tagline={data.msg}
                                classes={
                                    "msg" +
                                    (data.clump ? " clump" : "") +
                                    (data.old_msg ? " old_msg" : "") // +
                                    // (index === 0 ? " msg_in" : "")
                                }
                                hideAvatar={data.clump}
                                key={data.id}
                            />)
                    }
                </div>

                {/* Input */}
                <ChatInput game={game} />

            </div>

            {/* Toggle Chat button */}
            <button id="chat_button" className="panel_button border_shadowed" onClick={toggleChat}>
                <img src="/icons/chat.svg" alt="Chat" />
                <span>{chatUnread > 9 ? "9+" : chatUnread || null}</span>

                {/* Bubble */}
                {chatBubble ?
                    <div className="bubble" data-expired={chatBubble.bubble_timed_out} key={chatBubble.id}>
                        <div className="inner">
                            <UserAvatar avatar={chatBubble?.user?.avatar} />
                            <div>
                                <strong>{chatBubble.user?.name}</strong>
                                <span>{chatBubble.msg}</span>
                            </div>
                        </div>
                    </div>
                    : null
                }

            </button>
        </div>
    </>)
}