import { socket } from "../socket";
import { clientData } from "../App";
import { useState } from "react";

export default function EmoteReactions({ wrap }) {

    // State
    const [disabled, setDisabled] = useState(null);

    /** Send emote */
    function emote(char) {
        // Emit
        socket.emit("emote", char);

        // Cooldown
        setDisabled(true);
        setTimeout(() => {
            setDisabled(null);
        }, clientData.reaction_cooldown);
    }

    return (
        <div className={`reactions flex${wrap ? " flex_wrap" : ""}`} aria-disabled={disabled}>
            {clientData.reactions.map(char => {
                return <button
                    className="item"
                    onClick={() => disabled ? null : emote(char)}
                    key={char}
                >
                    {char}
                </button>
            })}
        </div>
    )
}
