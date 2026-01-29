import { useEffect } from "react";
import { useState } from "react";
import { socket } from "../socket";

export default function EmoteBubble({ pnum, socketID }) {

    // Emote
    const [emote, setEmote] = useState(null);

    // Effects
    useEffect(() => {
        const eventPnum = `emote_from_${pnum}`;
        const eventSocketID = `emote_from_${socketID}`;

        // Emote event
        if(pnum !== undefined) socket.on(eventPnum, handleReceiveEmote);
        if(socketID !== undefined) socket.on(eventSocketID, handleReceiveEmote);

        
        // Handler
        function handleReceiveEmote(data) {

            console.log(data);

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
        }


        // Cleanup
        return () => {
            socket.off(eventPnum);
            socket.off(eventSocketID);
        };
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
