import { useState } from "react";

import Card from "./Card"
import Icon from "./Icon"
import { capitalizeFirstLetter, looseIndexOfObj } from "../Util"
import { isProduction } from "../socket"
import lang from "../lang";
import { clientData } from "../App";

const cardProperties = {
    "type": [
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
        "reverse", "skip", "2_skip", "wild", "draw2", "draw4",
        "choose_swap", "target_draw2",
        "!", "?", "$", "*",
        "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
    ],
    "color": [ "black", "red", "yellow", "blue", "green", "cyan", "orange", "purple", "pink" ],

    "choose_color": Boolean
}

/** Custom Deck editor */
export default function DeckEditor({ setMenu, toast }) {

    // Default
    const workingDefault = convertToConciseDeck(clientData.decks.classic);

    const [working, setWorking] = useState(workingDefault);


    /** Converts workspace to a raw deck object */
    function convertToRawDeck() {
        let result = structuredClone(working).reduce((res, current) => res.concat([current, current]), []);
        result = result.map(card => {
            delete card.amount;
            delete card.rotation;
            return card;
        })
        return {
            name: document.getElementById("custom_name").value,
            desc: document.getElementById("custom_desc").value,
            cards: result
        };
    }

    /** Converts raw deck to concise array and removes name/desc properties */
    function convertToConciseDeck(rawReference) {
        const raw = structuredClone(rawReference);
        let result = [];

        for(const i in raw.cards) {
            const card = raw.cards[i];
            
            const existingIndex = looseIndexOfObj(result, card);
            console.log(card, existingIndex);
            if(existingIndex === -1) result.push({ ...card, amount:1 }); // New entry
            else result[existingIndex].amount++; // Incremement amount on existing entry
        }

        return result;
    }

    function writeToLocal() {
        const raw = convertToRawDeck();

        localStorage.setItem("nu_deck_0", JSON.stringify(raw));

        toast({ title: "Saved deck to localStorage" });
    }

    function changeAmount(index, change) {
        let modified = structuredClone(working);
        modified[index].amount += change;
        if(modified[index].amount <= 0 || modified[index].amount > 108) return;
        setWorking(modified);
    }

    function removeCard(index) {
        let modified = structuredClone(working);
        modified.splice(index, 1);
        setWorking(modified);
    }

    function addCard() {
        let modified = structuredClone(working);
        modified.push({
            amount: 1,
            color: "red",
            type: 0
        })

        setWorking(modified);
    }

    function clearWorkspace() {
        setWorking([]);
    }

    /** Resets workspace and imports an existing deck */
    function toExisting(name="classic") {
        if(!clientData.decks[name]) return console.warn(`Deck "${name}" doesn't exist`);

        const converted = convertToConciseDeck(clientData.decks[name]);
        setWorking(converted);
    }

    /** onChange handler for import deck dropdown */
    function handleImportDeck({ target }) {
        toExisting(target.value);
        toast({ title:`Imported deck`, msg:`${lang.en[target.value]}` });

        target.value = "none";
    }

    /** Returns total number of cards */
    function getCardTotal() {
        return working.reduce((total, item) => item.amount + total, 0);
    }

    return (
        <main id="deck_editor" className="container">
            {/* Exit */}
            <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed button_mini" onClick={() => setMenu(null)}>
                Exit
            </button>
            <br/>

            {/* Nav */}
            <nav>
                <h2 className="border_shadowed">
                    <input type="text" id="custom_name" className="discreet" defaultValue="Unnamed Deck" />
                    <img src="/icons/edit_24dp_FFFFFF_FILL0_wght400_GRAD200_opsz24.svg" alt="Rename" className="icon_inline"/>
                </h2>

                <h4 className="secondary_text">
                    <input type="text" id="custom_desc" className="discreet" defaultValue="Description" />
                    <img src="/icons/edit_24dp_FFFFFF_FILL0_wght400_GRAD200_opsz24.svg" alt="Rename" className="icon_inline" />
                </h4>

                <div className="flex flex_wrap gap_12px">
                    {/* Save */}
                    <button className="button_primary button_secondary button_mini hover_border_shadowed" onClick={writeToLocal}>
                        Save
                    </button>

                    {/* Clear */}
                    <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed button_mini" onClick={clearWorkspace}>
                        Clear
                    </button>

                    {/* Debug */}
                    {isProduction ? null :
                        <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowedg button_mini hover_border_shadowed" onClick={() => console.log(convertToRawDeck())}>
                            Export to console
                        </button>
                    }

                    {/* Import */}
                    <div className="input_container ">
                        <select name="import_deck" id="import_deck" class="button_mainbg" onChange={handleImportDeck}>
                            <option value="none">
                                Import deck...
                            </option>
                            {Object.keys(clientData.decks).map(key => {
                                return (
                                    <option value={key}>{lang.en[key]}</option>
                                )
                            })}
                        </select>
                    </div>

                </div>
            </nav>
            <br/>

            {/* <hr />
            <br/> */}

            {/* Info bar */}
            <p className="secondary_text">
                Cards: <strong>{getCardTotal()}</strong>
            </p>
            <br/>

            {/* List */}
            <div className="deck_list">
                {working.map((data, cardIndex) => {
                    return (
                        <div className="item" key={cardIndex}>
                            {/* Upper */}
                            <div className="upper flex">
                                {/* Preview */}
                                <Card data={data} />

                                {/* Configuration */}
                                <div className="right flex">
                                    {/* Properties */}
                                    <div className="properties flex">

                                        {/* Color */}
                                        <Picker property="color" data={data} cardIndex={cardIndex} />

                                        {/* Type */}
                                        <Picker property="type" data={data} cardIndex={cardIndex} />

                                        {/* choose_color */}
                                        <Picker property="choose_color" data={data} cardIndex={cardIndex} />
                                    </div>

                                    {/* Debug */}
                                    <table className="border_shadowed">
                                        {Object.entries(data).map(([key, value]) => {
                                            if(key === "rotation") return null;
                                            return (
                                                <tr>
                                                    <th>{key}</th>
                                                    <td>{JSON.stringify(value)}</td>
                                                </tr>
                                            )
                                        })}
                                    </table>
                                </div>
                            </div>

                            {/* Lower */}
                            <div className="flex gap_6px">
                                {/* Amount */}
                                <div className="input_container border_shadowed">
                                    <button className="number_input_btn" onClick={() => changeAmount(cardIndex, -1)} disabled={data.amount === 1}>
                                        -
                                    </button>
                                    <input type="text" value={`x${data.amount}`} disabled />
                                    <button className="number_input_btn" onClick={() => changeAmount(cardIndex, 1)}>
                                        +
                                    </button>
                                </div>

                                {/* Remove */}
                                <button className="button_primary button_mainbg button_border_bg_main button_micro border_shadowed" onClick={() => removeCard(cardIndex)} data-title="Remove">
                                    <img src="/icons/delete_forever_24dp_FFFFFF_FILL1_wght400_GRAD200_opsz24.svg" alt="Remove" className="parent_invert" />
                                </button>
                            </div>
                        </div>
                    )
                })}


                {/* Add */}
                <button className="item flex custom_add_card flex_center_vertically flex_center_horizontally" data-title="Add card type" onClick={addCard}>
                    +
                </button>
            </div>
        </main>
    )




    
    function Picker({ property, data, cardIndex }) {

        const doIcon = property !== "color";
        const value = data[property];

        function handleClick(v) {
            let modified = structuredClone(working);

            const card = modified[cardIndex];

            let value = v;

            // Boolean
            if(value === undefined) {
                value = !(card?.[property]);
                if(value === false) value = undefined;
            }

            // Set
            card[property] = value;
            if(value === undefined) delete card[property];

            // Unique property
            if(property === "choose_color") {
                if(value && card.type !== "draw4") card.style = "wild";
                else delete card.style;
            }

            // Special types
            if(property === "type") {
                // Choose swap
                if(value === "choose_swap") card.choose_swap = true;
                else delete card.choose_swap;

                // Draw2
                if(value === "draw2") card.draw = 2;
                else delete card.draw;

                // Target Draw2
                if(value === "target_draw2") card.target_draw = 2;
                else delete card.target_draw;

                // Draw4
                if(value === "draw4") {
                    card.draw = 4;
                    card.choose_color = true;
                }
                else {
                    delete card.draw;
                    delete card.choose_color;
                }

                // Reverse
                if(value === "reverse") card.reverse = true;
                else delete card.reverse;

                // Skip
                if(value === "skip") card.skip = 1;
                else delete card.skip;

                // Double skip
                if(typeof value === 'string' && value.includes("_skip")) {
                    card.type = "skip";
                    card.skip = Number(value[0]);
                }
                else delete card.skip;
            }

            setWorking(modified);
        }

        // Boolean toggles
        const isBoolean = cardProperties[property] === Boolean;
        const onClick = isBoolean ? () => handleClick() : null;

        const propertyLabel = lang.en[property] ?? capitalizeFirstLetter(property);
        const dataTitle = isBoolean ? `${propertyLabel}` : null;

        return (
            <button className={`picker ${value}`} onClick={onClick} data-title={dataTitle}>
                {/* Button */}
                <div>
                    {doIcon ? <Icon icon={value} /> : null}
                </div>

                {/* Popup */}
                {isBoolean ? null :
                    <div className="content">
                    {/* List */}
                    <div className="inner">
                        {cardProperties[property].map((value, propertyIndex) => {
                            // Represent value
                            return (
                                <button className={`picker_value ${value}`} key={propertyIndex} onClick={() => handleClick(value)}>
                                    {doIcon ? <Icon icon={value} /> : null}
                                </button>
                            )
                        })}
                    </div>

                    {/* Label */}
                    <strong>
                        {propertyLabel} ({value})
                    </strong>
                </div>    
            }
            </button>
        )
    }
}


