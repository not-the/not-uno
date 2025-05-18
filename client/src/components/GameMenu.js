import lang from "../lang";

export default function GameMenu({ game, isHost, toggleMenu, leaveGame, returnToLobby }) {
    return (
        <div id="menu" className="overlay">
                <div className="inner">
                    <h2 className="border_shadowed">Menu</h2>

                    {/* Info */}
                    <div className="flex">
                        {/* Players */}
                        {/* <div className="users_list">
                            {Object.entries(game.usersParsed).map(([, user], index) => {
                                return <User
                                    key={index} user={user} game={game}
                                    title={`ID: ${user.socketID}
                                    ${isHost ? " (Host)":""}`}
                                />
                            })}
                        </div> */}

                        {/* Config */}
                        <div className="fullwidth">
                            {/* <h4>Config</h4> */}
                            <table className="fullwidth">
                                {Object.entries(game.config).map(([key, value]) => {
                                    // Skip
                                    const hidden = ["enable_chat", "public_lobby"];
                                    if(value === false || hidden.includes(key)) return null;

                                    // Row
                                    return (
                                        <tr key={key}>
                                            <th>{lang.en[key]}</th>
                                            <td className="text_align_right">{lang.en[String(value)] ?? String(value)}</td>
                                        </tr>
                                    )
                                })}
                            </table>
                        </div>
                    </div>
                    <br/>
                    <br/>
                    
                    {/* Buttons */}
                    <div className="flex flex_column gap_12px">
                        <div className="flex media_flex col gap_12px">
                            {/* Leave */}
                            <button className="button_primary button_secondary hover_border_shadowed position_relative" onClick={toggleMenu}>
                                <span>Return to game</span>
                                <kbd>ESC</kbd>
                            </button>

                            {/* Leave */}
                            <button className="button_primary button_secondary button_transparent hover_border_shadowed" onClick={leaveGame}>
                                <span>
                                    {game.my_num !== -1 ?
                                        "Quit game" :
                                        "Stop spectating"
                                    }
                                </span>
                            </button>
                        </div>

                        {/* Return to lobby */}
                        {!isHost ? null :
                            <button className="button_primary button_secondary hover_border_shadowed button_transparent" onClick={returnToLobby}>
                                <span>Back to lobby</span>
                            </button>
                        }
                    </div>
                </div>
            </div>
    )
}
