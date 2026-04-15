import { useEffect } from "react";
import { useState } from "react";
import { socket } from "../socket";

export default function EmoteBubble({ socketID }) {

    // return null;

    // Emote
    const [emote, setEmote] = useState(null);

    // Effects
    useEffect(() => {
        if(!socketID) return;

        const eventName = `emote_from_${socketID}`;

        // Emote event
        socket.on(eventName, (data) => {
            // Set
            setEmote(data);

            // Delay
            setTimeout(() => {
                // Remove emote
                setEmote(old => {
                    if(old.id === data.id) return null;
                    else return old; // Is a different emote now
                }); 
            }, 3000);
        });

        // Cleanup
        return () => socket.off(eventName);
    })

    // JSX
    return !emote ? null :
        <div className={`emote_bubble${emote.style===1?" emote_last_card" : ""}`} key={emote.id}>
            <div className="inner">
                <span className={emote.style===1?"border_shadowed":null}>
                    {emote.msg}
                </span>
                <div className="progress"/>
            </div>
        </div>;
}
