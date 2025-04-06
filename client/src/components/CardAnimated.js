import Card from "./Card";

/** Animated card */
export default function CardAnimated({ game }) {
    /** Takes in a string ("deck" or "pile") or a player ID & card ID and returns the relevant DOM object */
    function getCardRect(name, index=(game?.players?.[game?.my_num]?.cards?.length-1)??1) {
        let loc;

        // Player
        try {
            if(typeof name === 'number') loc = document.querySelector(`.player_${name} .card:nth-of-type(${index+1})`);
            // Deck/pile
            else loc = document.getElementById(name);
        } catch (error) {
            console.error(error);
        }
        
        return loc?.getBoundingClientRect() ?? new DOMRect();
    }

    // Get to/from positions
    const startRect = getCardRect(game.animation?.fromName, game.animation?.fromIndex-1);
    const endRect = getCardRect(game.animation?.toName);

    // JSX
    const cardAnimated =
        game.animation === undefined ? null :
            <Card key={game.animation_key} data={game.animation.card} animated={true} style={{
                "--start-x": `${startRect.x}px`,
                "--start-y": `${startRect.y}px`,
                "--end-x": `${endRect.x}px`,
                "--end-y": `${endRect.y}px`,
            }} />;

    return (
        <div className="animation_container">
            {cardAnimated}
        </div>
    )
}


// import Card from "./Card";

// /** Animated card */
// export default function CardAnimated({ game }) {
//     /** Takes in a string ("deck" or "pile") or a player ID & card ID and returns the relevant DOM object */
//     function getCardRect(id) {

//         let loc;

//         try {
//             loc = document.getElementById(id);
//             console.log(loc);
//         } catch (error) {
//             console.error(error);
//         }

        
//         return loc?.getBoundingClientRect() ?? new DOMRect();
//     }

//     // Get to/from positions
//     const startRect = getCardRect(game.animation?.from);
//     const endRect = getCardRect(game.animation?.to);

//     // JSX
//     const cardAnimated =
//         game.animation === undefined
//             ? null :
//             <Card key={game.animation_key} data={game.animation.card} animated={true} style={{
//                 "--start-x": `${startRect.x}px`,
//                 "--start-y": `${startRect.y}px`,
//                 "--end-x": `${endRect.x}px`,
//                 "--end-y": `${endRect.y}px`,
//             }} />;

//     return (
//         <div className="animation_container">
//             {cardAnimated}
//         </div>
//     )
// }