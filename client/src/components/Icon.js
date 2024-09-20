const icons = {
    "reverse": <img src="/icons/reverse.png" alt="Reverse" />,
    "skip": <img src="/icons/Skip.svg" alt="Skip" />,
    "draw2": <img src="/icons/draw2.png" alt="Draw 2" />,
    "draw4": <img src="/icons/draw4.png" alt="Draw 4" />,
    "wild": <img src="" alt="WILD" style={{ "display":"none" }} />,
    "choose_swap": <img src="/icons/Force Swap.svg" alt="Force Swap" />,
}


export default function Icon({ icon, className="", amount=1 }) {
    const underlined = icon === '6' || icon === '9';
    const small_text = icon?.length > 2;

    const symbol =
        // Image
        icons?.[icon] ??
        // Text
        <p className={
            (underlined ? 'underline' : '') +
            (small_text ? ' small_text' : '')
        }>{icon}</p>;

    return (
        <div className={`symbol ${className}`} data-amount={amount}>
            {symbol}
            {amount > 1 ? symbol : null}
        </div>
    )
}
