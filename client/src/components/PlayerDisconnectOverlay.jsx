import React from 'react'

function PlayerDisconnectOverlay({ game, player, playerIndex, returnToLobby, removeDisconnectedPlayer }) {

    // Hidden
    if(!player.disconnected) return null;

    const buttonClasses = "button_primary button_secondary button_mainbg hover_border_shadowed button_mini margin_center";

    // JSX
    return (
        <div className="user_disconnect">
            {/* Title */}
            <h3 className="center border_shadowed">
                <img src="/icons/power_off_24dp_FFFFFF_FILL1_wght400_GRAD200_opsz24.svg" alt="" className="icon_inline" /> P{playerIndex+1} disconnected
            </h3>
            
            {game.players.length <= 2 ?
                /* End game */
                <button
                    className={buttonClasses}
                    onClick={() => { removeDisconnectedPlayer(playerIndex); returnToLobby(); }}
                >
                    End game
                </button>
                :
                /* Remove button */
                <button
                    className={buttonClasses}
                    onClick={() => removeDisconnectedPlayer(playerIndex)}
                >
                    Remove
                </button>
            }
        </div>
    )
}

export default PlayerDisconnectOverlay