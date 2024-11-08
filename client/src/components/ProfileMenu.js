import User from "./User"
import { capitalizeFirstLetter } from "../Util"
import { useState } from "react";

export default function ProfileMenu({ profile, getRandomName, setUser, clientData, setProfileOpen }) {
    const [nameInput, setNameInput] = useState(profile.name);

    function doneProfile() {
        setProfileOpen(false);
        setUser(nameInput);
    }

    function randomizeName() {
        const result = getRandomName();
        document.getElementById("username_input").value = result;
        setNameInput(result);
    }

    return (
        <div id="profile" className="dialog border_shadowed">
            <h3 className="border_shadowed">Profile</h3>

            {/* Preview */}
            <User user={{ ...profile, name:nameInput }} classes="big_user" />
            <br/><hr/><br/>

            {/* Name */}
            <label htmlFor="profile_name">
                <div className="flex">
                    <h5>Username</h5>
                    
                    {/* Random username */}
                    <button
                        className="hover_underline flex flex_center_vertically gap_6px margin_left_auto"
                        onClick={randomizeName}
                    >
                        <img src="/icons/casino_24dp_E8EAED_FILL1_wght400_GRAD200_opsz20.svg" alt="Random" className="icon_inline parent_invert" />
                        Randomize
                    </button>
                </div>

                {/* Input */}
                <input className="input_primary"
                    type="text" name="username_input" id="username_input"
                    placeholder="Username"
                    defaultValue={profile.name}
                    onChange={event => setNameInput(event.target.value)}
                    onKeyDown={event => { if(event.key === "Enter") setUser(nameInput) }}
                />

            </label>
            <br/><br/><hr/><br/>

            {/* Avatar */}
            <h5>Avatar</h5>
            <div className="avatar_list">
                {clientData.avatars.map((name, index) => {
                    return (
                        <button data-title={capitalizeFirstLetter(name)} key={index}
                            onClick={() => setUser(undefined, name)}
                            className={name === profile.avatar ? "active" : null}
                        >
                            <img src={`/avatars/${name}.png`} alt={name} className="avatar_preview" />
                        </button>
                    )
                })
                    
                }
            </div>

            <br/><hr/><br/>

            {/* Done */}
            <button className="button_primary button_secondary button_comp" onClick={doneProfile}>
                Done
            </button>
        </div>
    )
}