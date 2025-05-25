import { useEffect, useState } from "react";
import { socket } from "../socket"
import UserAvatar from "./UserAvatar";

export default function User({ user, game, tagline, title, postName, classes="", onClick=null, setProfileOpen, hideAvatar=false, background }) {

    // Kick
    function kick(socketIDToKick) {
        socket.emit("kick", socketIDToKick);
    }

    // User's data
    let userData = user;
    const isMe = userData?.socketID === socket.id;
    const isHost = userData?.socketID === game?.host;

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
        <img src="/icons/person.svg" alt="(You)" className="you extra" />
        : null;

    const spectatingIndicator = !user?.spectating ? null :
        <div className="extra smaller">(Spectating)</div>

    return (
        <div className={className} data-title={title} onClick={onClick} style={!background ? null : { "--background":`url('${background}')` }}>
            {/* Avatar */}
            {hideAvatar ? <div className="avatar"/> : <UserAvatar avatar={userData?.avatar} />}

            {/* Crown */}
            <span className="crown">
                {(game !== undefined && isHost) ? "👑" : ""}
            </span>

            <div className="right">
                {/* Username */}
                <div className="flex flex_center_vertically">
                    <span className={`name ${tagline ? " small_name" : null}`}>
                        {userData?.name ?? "Player"} {postName}
                    </span>

                    {/* You */}
                    {afterName}

                    {/* Spectating */}
                    {spectatingIndicator}
                </div>

                {/* Tagline or message */}
                <p className="tagline">{tagline}</p>
            </div>

            {/* Options */}
            <div className="user_buttons">
                {/* Kick */}
                {!isMe && game?.host === socket.id ?
                    <button className="button bold hover_underline" onClick={() => kick(userData?.socketID)}>
                        Kick
                    </button>
                    :
                    null
                }
                {/* Edit profile */}
                {!isMe || !setProfileOpen ? null :
                    <img
                        src="/icons/edit_24dp_FFFFFF_FILL0_wght400_GRAD200_opsz24.svg" alt="" role="button" tabIndex="0"
                        className="button user_inner_button"
                        onClick={() => setProfileOpen(true)}
                    />
                }
            </div>
        </div>
    )
}