import { socket } from "../socket"
import { clientData } from "../App";
import lang from "../lang"

export default function ConfigDeck({ game }) {

    const myHost = game.host === socket.id;

    const deckEntries = Object.entries(clientData.decks);
    const currentIndex = Object.keys(clientData.decks).indexOf(game.config.starting_deck);

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
                            <h3 class="border_shadowed">{lang.en[key]}</h3>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}