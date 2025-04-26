
import { useState } from "react"
import { socket } from "../socket"

import { clientData } from "../App.js"
import lang from "../lang"

/** Config item */
export default function Config({ name, game, disabled }) {
    // Data from server
    const options = clientData.config;
    const conditionals = {
        "public_lobby": () => !game?.nameIsUUID,
        "enable_chat": () => game?.has_been_public,
        "call_draw_penalty": () => !game?.config?.require_call
    }
    
    const option = options[name];
    const condition = disabled || conditionals?.[name]?.();
    const disabled_reason = option.condition_reason ?? "Disabled";

    function updateConfig(option, value) {
        socket.emit("update_config", { option, value });
    }

    return (
        <div className="item" aria-disabled={condition ? "true" : "false"}>
            {/* Decorator */}
            <div className="decorator"/>

            {/* Icon */}
            <img src={option.icon} alt="" className="border_shadowed" />

            {/* Inner */}
            <label htmlFor={name}>
                <div className="inner media_flex">
                    {/* About */}
                    <div>
                        <h4 className="border_shadowed">
                            {lang.en[name] ?? name}
                            {condition ? <span className="small">({disabled_reason})</span> : null}
                        </h4>
                        {option.desc ? <p className="desc">{option.desc}</p> : null}
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
        </div>
    )
}

/** Inputs */
function Input({ id, option, configValue, updateConfig, disabled }) {
    const [localValue, setValue] = useState(configValue);

    const { type, min, max } = option;
    const step = option.step ?? 1;

    let configValueFormatted = configValue;
    if(option.format) configValueFormatted = option.format.split("#").join(configValue);

    function set(v) {
        // console.log(id, v);
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
        const buttonDown = <button className="number_input_btn" onClick={() => set(old => old-step)} disabled={configValue === min}>
            -
        </button>;
        const input = <input id={id} type="text" min={min} max={max} value={configValueFormatted} onChange={event => set(Number(event.target.value))} disabled />;
        const buttonUp = <button className="number_input_btn" onClick={() => set(old => old+step)} disabled={configValue === max}>
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
                <span/>
            </div>
        )
    }

    else if(type === "dropdown") {
        return (
            <select name={id} id={id} value={configValue} onChange={event => set(event.target.value)} disabled={disabled}>
                {option.dropdown.map(item => {
                    return <option value={item}>{lang.en?.[item] ?? item}</option>
                })}
            </select>
        )
    }

    else return <p>(input no type specified)</p>
}