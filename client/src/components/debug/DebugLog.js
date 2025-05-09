import { useState } from "react";
import { formattedDate } from "../../Util";
import Card from "../Card";
import User from "../User";

export default function DebugLog({ lobby }) {

    const [filters, setFilters] = useState([]);

    const log = [...lobby.log].reverse().filter(entry => !filters.includes(entry.id));

    function toggleFilter(id) {
        setFilters(old => {
            if(old.includes(id)) return old.filter((oldID) => oldID !== id); // Remove
            else return [...old, id]; // Add
        })
    }
    
    return (
        <div class="debug_log">
            {/* Filters */}
            {filters.length === 0 ? null :
                <>
                    <span className="smaller">Filters:</span>
                    <div className="flex flex_wrap">
                        {filters.map(id => {
                            return (
                                <button className="button button_primary button_secondary button_micro button_transparent" onClick={() => toggleFilter(id)}>
                                    {id} (x)
                                </button>
                            )
                        })}
                    </div>
                </>
            }
            <br/>

            {/* Log */}
            {log.map((entry) => {
                const grayedOutValues = ["undefined", "SOCKET"];

                const cardEntry = entry.params.find(p => p.includes(`"color":`));

                const cardVisual = !cardEntry ? null :
                    <div><Card data={JSON.parse(cardEntry)} /></div>;

                // const userVisual

                return <div class="item flex" key={entry.index}>
                    {/* Inner */}
                    <div>
                        {/* Timestamp */}
                        <span className="smaller secondary_text">
                            {formattedDate(new Date(entry.timestamp))}
                        </span>
                        <br />

                        {/* Success status */}
                        {entry.success === undefined ? null :
                            entry.success ? "✅ " : "❌ "
                        }

                        {/* Method */}
                        <span className="debug_block special_debug_block" onClick={() => toggleFilter(entry.id)}>
                            {entry.id}
                        </span>

                        {/* Params */}
                        {entry.params.map((param, paramIndex) => {
                            return (
                                <span
                                    className={`smaller debug_block${grayedOutValues.includes(param) ? " gray weight_400" : ""}`}
                                    data-title={paramIndex}
                                    key={paramIndex}
                                >
                                    {!new RegExp(/^".{20}"$/).test(param) ? param:
                                        <User user={lobby.usersParsed[param.substring(1, param.length-1)]} tagline={param} />
                                    }
                                    {/* {param} */}
                                </span>
                            )
                        })}

                        {/* Amendment */}
                        <br />
                        <b class="bold smaller">
                            {entry.amendment}
                        </b>
                    </div>

                    {/* Card */}
                    {cardVisual}
                </div>
            })}
        </div>
    )
}
