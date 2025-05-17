import { socket } from "../socket";
import { clientData } from "../App";
import { useState } from "react";

export default function EmoteReactions() {

    // State
    const [disabled, setDisabled] = useState(null);

    /** Send emote */
    function emote(char) {
        console.log("yo");
        socket.emit("emote", char);

        // Cooldown
        setDisabled(true);
        setTimeout(() => {
            setDisabled(null);
        }, clientData.reaction_cooldown);
    }

    return (
        <div className="reactions flex" aria-disabled={disabled}>
            {clientData.reactions.map(char => {
                return <button
                    className="item"
                    onClick={() => disabled ? null : emote(char)}
                >
                    {char}
                </button>
            })}
        </div>
    )
}
