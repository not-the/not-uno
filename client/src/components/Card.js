// import { cloneElement } from 'react';
import { colorblind } from "../App.js"

import Icon from "./Icon.js"

export default function Card({ data=null, owner, game, rotation=0, onClick, style={}, animated, clickable }) {

    // Empty
    if(data === null) return (
        <div className="card empty"></div>
    )

    // Symbol amount
    let amount = data?.skip ?? 1;

    // Card back
    // let visible = (data.hidden || (owner !== game?.my_num));
    let visible = data.hidden;
    if(visible && !game?.config?.xray) return (
            <div id={data.ucid} className={`card back${animated?" animated":""}${clickable ? " clickable":""}`} onClick={onClick} tabIndex="0" role="button">
                <div className="oval"/>
                <Icon icon="NOPE" />
            </div>
    )


    // Corner symbol
    // let cornerSymbol = data.type;
    // if(cornerSymbol === "draw2") cornerSymbol = <Icon icon="+2" className="corner_symbol" />;
    // else if(cornerSymbol === "draw4") cornerSymbol = <Icon icon="+4" className="corner_symbol" />;
    // else if(cornerSymbol === "wild") cornerSymbol = <Icon icon={data.type} className="corner_symbol" />;

    // // Default
    // else cornerSymbol = <Icon icon={data.type} className="corner_symbol" />;

    // Bottom coner
    // CLONEELEMENT FUNCTION CAUSES VERY POOR PERFORMANCE ON RERENDERS
    // let bottomCornerSymbol = cloneElement(cornerSymbol, { className: cornerSymbol.props.className + " bottom_corner_symbol"});

    // CSS
    let classes = `card${data.color === 'black' ? ' no_decorator' : ''} ${data.color}`;
    if(visible && game?.config?.xray) classes += " xrayed";
    classes += ` ${data.type}`;
    if((owner === game?.my_num && onClick !== undefined) || clickable) classes += " clickable";
    if(animated) classes += " animated";
    if(data.style) classes += ` style_${data.style}`

    data.rotation ??= rotation;


    // Wild (conic gradient)
    let conic = null;
    if(data.style === "wild" && data.colors !== undefined) {

        let steps = [];

        for(let i = 0; i < data.colors.length; i++) {
            const color = data.colors[i];

            const step = 360/data.colors.length;
            const start = step*i;
            const end = step*(i+1)

            steps.push(`var(--${color}) ${start}deg ${end}deg`);
        }

        conic = steps.join(", ");
    }

    // HTML
    return (
        <div id={data.ucid} className={classes} onClick={onClick} tabIndex="0" role="button"
            style={{
                ...style,
                "transform": `rotate(${data.rotation}deg)`,
                "--conic": conic
            }}
        >
            {/* Decorator */}
            <div className="oval">
                <div className="oval_inner"/>
            </div>

            {/* Symbol - Top left */}
            {/* {cornerSymbol} */}

            {/* Symbol */}
            <Icon icon={data.type} amount={amount} />

            {/* Bottom left */}
            {!colorblind ? null :
                <div className="colorblind_indicator">
                    <span>
                        {
                            data.color === "black" ? "*" : data.color[0].toUpperCase()
                        }
                    </span>
                </div>
            }

            {/* Symbol - Bottom right */}
            {/* {bottomCornerSymbol} */}
        </div>
    )
}