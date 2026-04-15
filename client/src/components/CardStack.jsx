/** Visualization for a stack of cards */
export default function CardStack({ array }) {
    const height = array.length <= 1 ? 0 : (12 + Math.floor(array.length/10));
    return (
        <div
            className="card_stack"
            style={{ "height": `${height}px` }}
        />
    )
}