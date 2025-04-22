import { useState, useEffect } from "react"

import Card from "./Card";

/** Animated card */
export default function CardAnimated({ animation, animation_key }) {
    /** Takes in a string ("deck" or "pile") or a player ID & card ID and returns the relevant DOM object */
    function getCardRect(name, ucid) {
        let loc;

        // Player
        try {
            if(typeof name === 'number') {
                // Come from card
                loc = document.querySelector(`.player_${name} #${ucid}`);

                // Come from player
                if(loc === undefined) loc = document.querySelector(`.player_${name}`);
            }
            // Deck/pile
            else loc = document.getElementById(name);

            // console.log(loc);
        } catch (error) {
            // console.error(error);
        }
        
        return loc?.getBoundingClientRect() ?? new DOMRect();
    }

    const [cardAnimated, setCardAnimated] = useState(null);

    useEffect(() => {
        // Get to/from positions
        const startRect = getCardRect(animation?.fromName, animation.card.ucid);
        const endRect = getCardRect(animation?.toName, animation.card.ucid);

        // JSX
        setCardAnimated(
            animation === undefined ? null :
                <Card key={animation_key} data={animation.card} animated={true} style={{
                    "--start-x": `${startRect.x}px`,
                    "--start-y": `${startRect.y}px`,
                    "--end-x": `${endRect.x}px`,
                    "--end-y": `${endRect.y}px`,
                }} />
        )

        // return () => {}
    }, [animation_key])
    

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