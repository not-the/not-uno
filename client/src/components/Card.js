// import { cloneElement } from 'react';

import Icon from "./Icon.js"

export default function Card({ data=null, owner, game, rotation=0, onClick, style={}, animated }) {

    // Empty
    if(data === null) return (
        <div className="card empty"></div>
    )

    // Card back
    // let visible = (data.hidden || (owner !== game?.my_num));
    let visible = data.hidden;
    if(visible && !game?.config?.xray) return (
            <div className="card back" onClick={onClick} tabIndex="0" role="button">
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
    let classes = `card${data.color === 'black' ? ' no_decorator' : ''}`;
    if(visible && game?.config?.xray) classes += " xrayed";
    classes += ` ${data.type}`;
    if(owner === game?.my_num && onClick !== undefined) classes += " clickable";
    if(animated) classes += " animated";

    data.rotation ??= rotation;

    // Wild decorator
    let ovalInner;
    if(data.type === 'wild') {
        ovalInner =
        <div className="oval_inner">
            <div className="flex">
                <div className="red" /><div className="blue" />
            </div>
            <div className="flex">
                <div className="yellow" /><div className="green" />
            </div>
            <div className="gradient" />
        </div>
    }
    
    return (
        <div className={classes} onClick={onClick} tabIndex="0" role="button"
            style={{ ...style, "transform": `rotate(${data.rotation}deg)`, "--card-color": `var(--${data.color})` }}
        >
            {/* Decorator */}
            <div className="oval">{ovalInner}</div>

            {/* Corner */}
            {/* {cornerSymbol} */}

            {/* Symbol */}
            <Icon icon={data.type} />

            {/* Bottom corner */}
            {/* {bottomCornerSymbol} */}
        </div>
    )
}