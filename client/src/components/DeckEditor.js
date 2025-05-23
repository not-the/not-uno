import { useEffect, useState } from "react";

import Card from "./Card"
import Icon from "./Icon"
import { capitalizeFirstLetter, looseIndexOfObj } from "../Util"
import { isProduction, socket } from "../socket"
import lang from "../lang";
import { clientData } from "../App";
import DeckEditorCard from "./DeckEditorCard";

/** Custom Deck editor */
export default function DeckEditor({ setMenu, toast }) {

    // Default
    const workingDefault = convertToConciseDeck(clientData.decks.classic);

    const [working, setWorking] = useState(workingDefault);

    const [awaitingResponse, setAwaitingResponse] = useState(false);


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

    // Effects
    useEffect(() => {
        // Custom deck success
        socket.on("custom_deck_success", id => {
            console.log(id);

            let list = [id];

            if(localStorage.custom_decks) {
                list = [
                    ...JSON.parse(localStorage.getItem("custom_decks")),
                    id
                ];
            }

            localStorage.setItem("custom_decks", JSON.stringify(list));
            setAwaitingResponse(false);
            toast({ title:"Saved successfully" });
        })

        return () => {
            socket.off("custom_deck_success");
        }
    }, []);

    /** Sends deck to server and saves its ID to localStorage */
    function submitDeck() {
        const raw = convertToRawDeck();

        socket.emit("custom_deck", raw);
        setAwaitingResponse(true);



        // Localstorage only
        // let id = 1;
        // while(localStorage[`not_uno_deck${id}`] !== undefined) {
        //     id++;
        // }
        // localStorage.setItem(`not_uno_deck${id}`, JSON.stringify(raw));
        // toast({ title: "Saved deck to localStorage", msg:`ID: ${id}` });
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
        <>
        {/* Main */}
        <main id="deck_editor" className="container">
            {/* Exit */}
            <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed button_mini" onClick={() => setMenu(null)}>
                Exit
            </button>
            <br/>

            {/* Nav */}
            <nav>
                <h2 className="border_shadowed">
                    <img src="/icons/edit_24dp_FFFFFF_FILL0_wght400_GRAD200_opsz24.svg" alt="Rename" className="icon_inline"/> <input type="text" id="custom_name" className="discreet" defaultValue="Unnamed Deck" />
                </h2>

                <h4 className="secondary_text">
                    <img src="/icons/edit_24dp_FFFFFF_FILL0_wght400_GRAD200_opsz24.svg" alt="Rename" className="icon_inline" /> <input type="text" id="custom_desc" className="discreet" defaultValue="Description" />
                </h4>

                <div className="flex flex_wrap gap_12px">
                    {/* Save */}
                    <button className="button_primary button_secondary button_mini hover_border_shadowed" onClick={submitDeck}>
                        Submit
                    </button>

                    {/* Clear */}
                    <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed button_mini" onClick={clearWorkspace}>
                        Clear
                    </button>

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

                    {/* Debug */}
                    {isProduction ? null :
                        <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowedg button_mini hover_border_shadowed" onClick={() => console.log(convertToRawDeck())}>
                            Export to console
                        </button>
                    }

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
                        <DeckEditorCard data={data} cardIndex={cardIndex} working={working} setWorking={setWorking} />
                    )
                })}


                {/* Add */}
                <button className="item flex custom_add_card flex_center_vertically flex_center_horizontally" data-title="Add card type" onClick={addCard}>
                    +
                </button>
            </div>
        </main>

        {/* Overlay */}
        {!awaitingResponse ? null :
            <div className="overlay">
                <div className="inner">
                    <h3 class="border_shadowed">
                        <img src="/icons/Loader.svg" alt="Waiting..." className="loader_spin icon_inline" /> Submitting deck...
                    </h3>
                    <p class="secondary_text">If this gets stuck, the server may be unavailable</p>

                    
                </div>
            </div>
        }
        </>
    )
}
