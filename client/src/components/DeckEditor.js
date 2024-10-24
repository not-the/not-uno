import { useState } from "react";

import Card from "./Card"
import Icon from "./Icon"
import { capitalizeFirstLetter } from "../Util";

const cardProperties = {
    "type": [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, "skip", "wild", "draw2", "draw4" ],
    "color": [ "black", "red", "yellow", "blue", "green", "cyan", "orange", "purple" ]
}

/** Custom Deck editor */
export default function DeckEditor({ setMenu }) {

    const workingDefault = [
        { amount: 1, color: "red", type: "0" },
        { amount: 2, color: "red", type: "1" },
        { amount: 2, color: "red", type: "2" },
        { amount: 2, color: "red", type: "3" },
        { amount: 2, color: "red", type: "4" },
        { amount: 2, color: "red", type: "5" },
        { amount: 2, color: "red", type: "6" },
        { amount: 2, color: "red", type: "7" },
        { amount: 2, color: "red", type: "8" },
        { amount: 2, color: "red", type: "9" },

        { amount: 1, color: "yellow", type: "0" },
        { amount: 2, color: "yellow", type: "1" },
        { amount: 2, color: "yellow", type: "2" },
        { amount: 2, color: "yellow", type: "3" },
        { amount: 2, color: "yellow", type: "4" },
        { amount: 2, color: "yellow", type: "5" },
        { amount: 2, color: "yellow", type: "6" },
        { amount: 2, color: "yellow", type: "7" },
        { amount: 2, color: "yellow", type: "8" },
        { amount: 2, color: "yellow", type: "9" },

        { amount: 1, color: "blue", type: "0" },
        { amount: 2, color: "blue", type: "1" },
        { amount: 2, color: "blue", type: "2" },
        { amount: 2, color: "blue", type: "3" },
        { amount: 2, color: "blue", type: "4" },
        { amount: 2, color: "blue", type: "5" },
        { amount: 2, color: "blue", type: "6" },
        { amount: 2, color: "blue", type: "7" },
        { amount: 2, color: "blue", type: "8" },
        { amount: 2, color: "blue", type: "9" },

        { amount: 1, color: "green", type: "0" },
        { amount: 2, color: "green", type: "1" },
        { amount: 2, color: "green", type: "2" },
        { amount: 2, color: "green", type: "3" },
        { amount: 2, color: "green", type: "4" },
        { amount: 2, color: "green", type: "5" },
        { amount: 2, color: "green", type: "6" },
        { amount: 2, color: "green", type: "7" },
        { amount: 2, color: "green", type: "8" },
        { amount: 2, color: "green", type: "9" },

        { amount: 2, color: "red",      type: "draw2", draw: 2 },
        { amount: 2, color: "yellow",   type: "draw2", draw: 2 },
        { amount: 2, color: "blue",     type: "draw2", draw: 2 },
        { amount: 2, color: "green",    type: "draw2", draw: 2 },

        { amount: 2, color: "red",      type: "reverse", reverse: true },
        { amount: 2, color: "yellow",   type: "reverse", reverse: true },
        { amount: 2, color: "blue",     type: "reverse", reverse: true },
        { amount: 2, color: "green",    type: "reverse", reverse: true },

        { amount: 2, color: "red",      type: "skip", "skip": 1 },
        { amount: 2, color: "yellow",   type: "skip", "skip": 1 },
        { amount: 2, color: "blue",     type: "skip", "skip": 1 },
        { amount: 2, color: "green",    type: "skip", "skip": 1 },

        { amount: 4, color: "black", type: "wild", style: "wild", "choose_color": true },

        { amount: 4, color: "black", type: "draw4", draw: 4, "choose_color": true }
    ];


    const [working, setWorking] = useState(workingDefault);

    return (
        <main id="deck_editor" class="container">
            {/* Nav */}
            <nav>
                <h2 class="border_shadowed">Deck Builder</h2>
                <div className="flex gap_12px">
                    <button className="button_primary button_secondary button_mini" disabled>
                        Save
                    </button>
                    <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowedg button_mini" onClick={() => setMenu(null)}>
                        Exit
                    </button>
                </div>
            </nav>
            <br/>

            {/* List */}
            <div className="deck_list">
                {working.map((data, cardIndex) => {
                    return (
                        <div className="item flex" key={cardIndex}>
                            {/* Preview */}
                            <Card data={data} />

                            {/* Configuration */}
                            <div class="right">
                                {/* Properties */}
                                <div className="row flex">

                                    {/* Color */}
                                    <Picker property="color" data={data} cardIndex={cardIndex} />

                                    {/* Type */}
                                    <Picker property="type" data={data} cardIndex={cardIndex} />

                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </main>
    )




    
    function Picker({ property, data, cardIndex }) {

        const doIcon = property !== "color";
        const value = data[property];

        function handleClick(index, value) {
            let modified = structuredClone(working);
            modified[index][property] = value;
            setWorking(modified);
        }

        return (
            <button className={`picker ${value}`}>
                {/* Button */}
                <div>
                    {doIcon ? <Icon icon={value} /> : null}
                </div>

                {/* Popup */}
                <div className="content">
                    {/* List */}
                    <div className="inner">
                        {cardProperties[property].map((value, propertyIndex) => {
                            // Represent value
                            return (
                                <button class={`picker_value ${value}`} key={propertyIndex} onClick={() => handleClick(cardIndex, value)}>
                                    {doIcon ? <Icon icon={value} /> : null}
                                </button>
                            )
                        })}
                    </div>

                    {/* Label */}
                    <strong>
                        {capitalizeFirstLetter(property)} ({value})
                    </strong>
                </div>
            </button>
        )
    }
}


