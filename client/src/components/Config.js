
import { useState } from "react"
import { socket } from "../socket"

import lang from "../lang"

/** Config item */
export default function Config({ name, game, disabled }) {
    const options = {
        "starting_deck": {
            title: "Deck",
            desc: "Game version",
            icon: "/icons/play.svg",

            type: "dropdown",
            dropdown: ["normal", "all_wilds", "debug"]
        },
        "starting_cards": {
            title: "Starting cards",
            desc: "Number of cards each player starts with",
            icon: "/icons/Three Cards.svg",

            type: "number",
            min: 3, max: 12
        },
        "draw_stacking": {
            title: "Draw Stacking",
            desc: "Playing a +2 or +4 card allows you to avoid drawing cards yourself",
            icon: "/icons/Draw Stacking.svg",

            type: "dropdown",
            dropdown: ["off", /*"matching",*/ "any"]
        },
        "continue": {
            title: "Continues",
            desc: "Continue the game after a winner is decided",
            icon: "/icons/Continue.svg",

            type: "boolean"
        },

        "public_lobby": {
            title: "Public",
            desc: "Makes your lobby public",

            icon: "/icons/Door.svg",
            type: "boolean",
            
            condition: () => !game?.nameIsUUID,
            condition_reason: "Room ID must not be user-defined"
        },
        "enable_chat": {
            title: "Chat",
            desc: "Enables the chat menu",

            icon: "/icons/chat.svg",
            type: "boolean",

            condition: () => game?.has_been_public,
            condition_reason: "Private games only"
        },
        "xray": {
            title: "Hands Down",
            desc: "Everyone's cards are visible",

            icon: "/icons/Magnify.svg",
            type: "boolean"
        },
        "infinite_draw": {
            title: "Infinite Draw",
            desc: "You can continue to draw cards until you get a match",

            icon: "/icons/Infinity.svg",
            type: "boolean"
        }
    }

    const option = options[name];
    const condition = disabled || option?.condition?.();
    const disabled_reason = option.condition_reason ?? "Not implemented";

    function updateConfig(option, value) {
        socket.emit("update_config", { option, value });
    }

    return (
        <div className="item" aria-disabled={condition ? "true" : "false"}>
            <img src={option.icon} alt="" className="border_shadowed" />
            <label htmlFor={name}>
                <div className="inner media_flex">
                    {/* About */}
                    <div>
                        <h4 className="border_shadowed">
                            {option.title}
                            {condition ? <span className="small">({disabled_reason})</span> : null}
                        </h4>
                        <p className="desc">{option.desc}</p>
                    </div>

                    {/* Input */}
                    <div className="input_container border_shadowed margin_left_auto">
                        <Input
                            option={option}
                            id={name}
                            configValue={game.config[name]}
                            updateConfig={updateConfig}
                            disabled={disabled || (socket.id !== game.host)}
                        />
                    </div>
                </div>
            </label>
            <div className="decorator"/>
        </div>
    )
}

/** Inputs */
function Input({ id, option, configValue, updateConfig, disabled }) {
    const [localValue, setValue] = useState(configValue);

    const { type, min, max } = option;

    function set(v) {
        console.log(id, v);
        // if(disabled) return;

        setValue(old => {
            const newValue = typeof v === 'function' ? v(old) : v;

            if(newValue < min || newValue > max) return old;

            updateConfig(id, newValue);
            document.getElementById(id).value = newValue;

            return newValue;
        });
    }

    if(type === "number") {
        const buttonDown = <button className="number_input_btn" onClick={() => set(old => old-1)}>
            -
        </button>;
        const input = <input id={id} type="number" min={min} max={max} value={configValue} onChange={event => set(Number(event.target.value))} disabled />;
        const buttonUp = <button className="number_input_btn" onClick={() => set(old => old+1)}>
            +
        </button>;

        return (
            <>
                {disabled ? null : buttonDown}
                {input}
                {disabled ? null : buttonUp}
            </>
        )
    }
    else if(type === "boolean") {
        return (
            <div className="toggle" aria-disabled={disabled}>
                <input type="checkbox" name={id} id={id} checked={configValue} onClick={() => set(old => !old)} disabled={disabled} />
                <span className="border_shadowed" />
            </div>
        )
    }

    else if(type === "dropdown") {
        return (
            <select name={id} id={id} value={configValue} onChange={event => set(event.target.value)} disabled={disabled}>
                {option.dropdown.map((item, index) => {
                    return <option value={item}>{lang.en?.[item] ?? item}</option>
                })}
            </select>
        )
    }

    else return <p>(input no type specified)</p>
}