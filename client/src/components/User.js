import { socket } from "../socket"

export default function User({ user, game, tagline, title, postName, classes="", onClick }) {

    let userData = user;
    const isMe = userData?.socketID === socket.id;

    // System message
    if(user === "system") {
        userData = {
            name: "System",
            avatar: "none",
        }
    }

    let className = `user ${tagline?"has_tagline":""}`;
    className += " " + classes;

    const afterName = isMe ?
        // <span className="after_name">(You)</span>
        <img src="/icons/person.svg" alt="(You)" className="you" />
        : null;

    return (
        <div className={className} data-title={title} onClick={onClick}>
            {/* Avatar */}
            <img src={`/avatars/${userData?.avatar ?? "balloon"}.png`} alt="" className="avatar" />

            {/* Crown */}
            <span className="crown">
                {(game !== undefined && userData?.socketID === game?.host) ? "👑" : ""}
            </span>

            <div className="right">
                {/* Username */}
                <div className="flex flex_center_vertically">
                    <span className={`name ${tagline ? " small_name" : null}`}>
                        {userData?.name ?? "Player"} {postName}
                    </span>
                    {afterName}
                </div>

                <p className="tagline">{tagline}</p>
            </div>

            {/* Options */}
            {/* <button className="user_options">
                <img src="/icons/Three Dots.svg" alt="Options" />
            </button> */}
        </div>
    )
}