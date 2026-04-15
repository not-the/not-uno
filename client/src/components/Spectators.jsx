import User from "./User";

export default function Spectators({ game }) {
    const spectators = Object.values(game.usersParsed).filter(u => u.spectating);

    const inner = (
        <div>
            <img src="/icons/eyeball.svg" alt="" className="icon_inline secondary_text" /> {game.spectatorCount} spectator{game.spectatorCount===1?"":"s"}
        </div>
    )

    return (
        game.spectatorCount === 0 ? null :
            <p className="spectators_hover">
                {/* Inner */}
                <span className="inner secondary_text" tabIndex="0">
                    {/* Icon */}
                    {inner}
                </span>

                {/* List */}
                <div className="spectators_list border_shadowed">
                    {/* Inner */}
                    {inner}

                    {/* Users */}
                    {spectators.map(spectator => {
                        return <User user={spectator} game={game} classes="small_user" />
                    })}
                </div>
            </p>
    )
}
