import lang from "../lang"


export default function LobbyListing({ lobby, joinRoom, classes }) {
    // Mode string
    let modeInfo = lang.en?.[lobby?.config?.starting_deck] ?? lobby?.config?.starting_deck;
    if(lobby?.config?.xray) {
        if(modeInfo === "Classic") modeInfo = "Hands Down";
        else modeInfo += ", Hands Down";
    }

    // Host socketID
    const host = lobby?.usersParsed[lobby?.host];

    const allClasses = [
        "lobby flex gap_12px",
        classes ?? ""
    ].join(" ");

    // JSX
    return (
        <div className={allClasses}>
            {/* Inner */}
            <div
                className="lobby_block inner flex gap_12px hover_border_shadowed"
                role="button" tabIndex="0"
                aria-disabled={lobby.state !== "lobby"}
                onClick={() => joinRoom(lobby.roomID)}
            >
                {/* Icon */}
                <img src={`/avatars/${host?.avatar}.png`} alt="" className="avatar" />

                {/* Right */}
                <div className="fullwidth">
                    <div className="flex media_flex">
                        <strong>
                            {lobby.roomID}
                        </strong>
                        <div className="margin_left_auto">
                            Mode: <b>{modeInfo}</b>
                        </div>
                    </div>
                    <div className="flex media_flex secondary_text">
                        <p>
                            Host: <b>{host?.name}</b>
                        </p>
                        <p className="margin_left_auto">
                            Players: {Object.keys(lobby?.usersParsed??{}).length}/{lobby.config.max_players}
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Spectate */}
            {!lobby.config.spectators ? null :
                <div
                    className="lobby_block spectate_btn hover_border_shadowed flex flex_center"
                    title="Spectate"
                    role="button" tabIndex="0"
                    onClick={() => joinRoom(lobby.roomID, true)}
                >
                    <img src="/icons/eyeball.svg" alt="Click to spectate" className="icon_inline secondary_text" />
                </div>
            }
        </div>
    )
}