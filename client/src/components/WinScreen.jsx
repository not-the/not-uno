import { socket } from "../socket"
import SupportBlurb from "./SupportBlurb"
import User from "./User"

export default function WinScreen({ game, isHost, startGame, requestRematch, returnToLobby, leaveGame }) {

    // Rematch count
    const playersWantRematch = game.players.filter(p => p?.wants_rematch === true);

    return (
        <div id="win_screen" className="overlay content_overlay">
            <div className="content_backdrop"/>

            {/* Winner blurb */}
            <div className="inner">
                <h2 className="border_shadowed">
                    {game.winner === socket.id ?
                        "You win! 🎉" :
                        `${game.usersParsed[game.winner]?.name} won...`
                    }
                </h2>

                {/* Winner */}
                <User user={game.usersParsed[game.winner]} classes="big_user" />
                <br/>

                {/* Rematch request count */}
                <p className={`flex flex_center gap_12px ${playersWantRematch.length === 0 ? "secondary_text" : "bounce"} center`} key={playersWantRematch.length}>
                    {/* <div className="avatar_stack">
                        {playersWantRematch.map(p => <UserAvatar avatar={game.usersParsed?.[p.socketID]?.avatar} />)}
                    </div> */}

                    {
                        game.players.length !== 1 ?
                        `${playersWantRematch.length}/${game.players.length-1} players have requested a rematch` :
                        "Very impressive"
                    }
                </p><br/>

                {/* Buttons */}
                <div className="flex media_flex col gap_6px">
                    {/* Rematch */}
                    {isHost ?
                        <button className="button_primary button_secondary hover_border_shadowed" onClick={startGame}>
                            Play again
                        </button>
                        :
                        <button className="button_primary button_secondary hover_border_shadowed" onClick={requestRematch} disabled={(game.players?.[game.my_num]?.wants_rematch || game.my_spectating) ? true : false}>
                            Request rematch
                        </button>
                    }
                    {/* Leave */}
                    {isHost ?
                    <button className="button_primary button_secondary button_transparent hover_border_shadowed position_relative" onClick={returnToLobby}>
                        <span>Back to lobby</span>
                    </button>
                    :
                    <button className="button_primary button_secondary button_transparent hover_border_shadowed" onClick={leaveGame}>
                        Leave
                    </button>
                    }
                </div>
            </div>



            {/* Support */}
            <SupportBlurb />
        </div>
    )
}
