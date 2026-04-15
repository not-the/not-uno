import lang from "../lang";
import { capitalizeFirstLetter } from "../Util";
import Card from "./Card";
import Icon from "./Icon";

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


/** Deck editor card */
export default function DeckEditorCard({ data, cardIndex, working, setWorking }) {

    function changeAmount(index, change) {
        let modified = structuredClone(working);
        modified[index].amount += change;
        if(modified[index].amount <= 0 || modified[index].amount > 120) return;
        setWorking(modified);
    }

    function removeCard(index) {
        let modified = structuredClone(working);
        modified.splice(index, 1);
        setWorking(modified);
    }

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
                        <Picker property="color" data={data} cardIndex={cardIndex} working={working} setWorking={setWorking} />

                        {/* Type */}
                        <Picker property="type" data={data} cardIndex={cardIndex} working={working} setWorking={setWorking} />

                        {/* choose_color */}
                        <Picker property="choose_color" data={data} cardIndex={cardIndex} working={working} setWorking={setWorking} />
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
}

function Picker({ property, data, cardIndex, working, setWorking }) {

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
