import { socket } from "../socket"
import { clientData } from "../App";

export default function ConfigDeck({ game }) {

    const allDecks = structuredClone(clientData.decks);

    // Object.entries(localStorage).forEach(([key, value]) => {
    //     console.log(key);
    //     if(!value === undefined || !key.startsWith("not_uno_deck")) return;
    //     // console.log(key, value);
    //     allDecks[key] = JSON.parse(value);
    // })

    const myHost = game.host === socket.id;

    const deckEntries = Object.entries(allDecks);
    const currentIndex = Object.keys(allDecks).indexOf(game.config.starting_deck);

    function updateStartingDeck(value) {
        console.log(value);
        socket.emit("update_config", { option:"starting_deck", value });
    }

    return (
        <div className="deck_picker" aria-disabled={!myHost ? true : null}>
            <ul
                className="inner"
                style={{
                    "--selection-index": currentIndex
                }}
            >
                {deckEntries.map(([key, value], index) => {
                    const isActive = currentIndex === index;

                    return (
                        <li
                            className="deck_item"
                            onClick={isActive || !myHost ? null : () => updateStartingDeck(key)}
                            role="button"
                            tabIndex={0}
                            aria-disabled={isActive ? true : null}
                            style={{
                                "--img": `url('/images/${key}.png')`
                            }}
                        >

                            <h3 class="border_shadowed">{value.name}</h3>
                        </li>
                    )
                })}
            </ul>

            {/* Deck Description */}
            {/* <br/>
            <p className="center secondary_text">
                {deckEntries[currentIndex][1].desc}
            </p> */}

        </div>
    )
}