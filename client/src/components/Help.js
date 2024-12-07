import { useEffect, useState } from "react";
import Card from "./Card";

export default function Help({ setMenu }) {

    // Cycling card colors
    const [cycleColor, setCycleColor] = useState("red");
    const colors = ["red", "yellow", "blue", "green"];
    let colorIndex = 0;
    useEffect(() => {
        const colorInterval = setInterval(() => {
            colorIndex++;
            if(colorIndex > colors.length-1) colorIndex = 0;

            setCycleColor(colors[colorIndex]);
        }, 3000);
        return () => clearInterval(colorInterval);
    }, []);


    // Tab
    const [tab, setTab] = useState("Classic");
    const allTabs = {
        "Classic": <Classic cycleColor={cycleColor} />,
        "All Wild!": <AllWild />,
        "7-0 rule": <SevenORule cycleColor={cycleColor} />
    }
    const tabContent = allTabs[tab];

    return (
        <main className="container" id="help">
            {/* Nav */}
            <nav className="flex gap_12px flex_wrap">
                <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed button_mini" onClick={() => setMenu("home")}>
                    &lt; Back
                </button>

                {/* Tabs */}
                <div style={{"display": "contents"}} role="tabpanel">
                    {Object.keys(allTabs).map(name => {
                        return (
                            <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed button_mini" onClick={() => setTab(name)} role="tab" aria-selected={tab === name ? "true" : null} >
                                {name}
                            </button>
                        )
                    })}
                </div>
            </nav>
            <br/>
            <br/>

            {/* Content */}
            {tabContent}
        </main>
    )
}



function Classic({ cycleColor }) {
    return (<>
        {/* Classic */}
        <section>
            <h3 class="fancy_title">
                <span>Classic - How to play</span>
            </h3>

            <p className="secondary_text paragraph">
                Each player starts with 7 cards. The goal is to get rid of all of your cards by discarding them in the pile. Your card must either match the symbol or color of the card in the pile for you to discard it.
            </p>
            <p className="secondary_text paragraph">
                The default deck has 108 cards.
            </p>
        </section>

        {/* Cards */}
        <section>
            <h3 class="fancy_title">
                <span>Special cards</span>
            </h3>

            <FigureCard
                data={{ "color": cycleColor, "type": "skip", "skip": 1 }}
                reverse={false}
                title={"Skip"}
                desc={"The next player will lose their turn."}
            />

            <FigureCard
                data={{ "color": cycleColor, "type": "draw2", "draw": 2 }}
                reverse={true}
                title={"Draw 2"}
                desc={"The next player will be forced to draw 2 cards from the deck and lose their turn."}
            />

            <FigureCard
                data={{ "color": cycleColor, "type": "reverse", "reverse": true }}
                reverse={false}
                title={"Reverse"}
                desc={"The direction of play will be reversed from clockwise to counter-clockwise, or vice versa. If there are only 2 players, it will act as a skip."}
            />
            
            <FigureCard
                data={{ "color": "black", "type": "wild", "style": "wild", "choose_color": true }}
                reverse={true}
                title={"Wild"}
                desc={"Wild cards can be played at any time and allow you to choose the pile's color when used."}
            />


            <FigureCard
                data={{ "color": "black", "type": "draw4", "choose_color": true }}
                reverse={false}
                title={"Wild Draw 4"}
                desc={"In additional to being a wild card, it also forces the next player to draw 4 cards from the deck, making them lose their turn."}
            />
        </section>
    </>)
}



function AllWild() {
    return (<>
        {/* Classic */}
        <section>
            <h3 class="fancy_title">
                <span>All Wild! - How to play</span>
            </h3>

            <p className="secondary_text paragraph">
                This game mode removes the need to match your cards to the pile. Instead, every card is Wild. Your goal is to use special cards to prevent anyone else from getting rid of theirs.
            </p>
        </section>

        {/* Cards */}
        <section>
            <h3 class="fancy_title">
                <span>Special cards</span>
            </h3>

            <FigureCard
                data={{ "color": "black", "type": "choose_swap", "style": "wild", "choose_swap": true }}
                reverse={false}
                title={"Force swap"}
                desc={"A player of your choosing will be forced to swap hands with you."}
            />

            <FigureCard
                data={{ "color": "black", "type": "skip", "style": "wild", "skip": 2 }}
                reverse={true}
                title={"Double skip"}
                desc={"Skips the next two players instead of only one."}
            />

            <FigureCard
                data={{ "color": "black", "type": "target_draw2", "style": "wild", "target_draw": 2 }}
                reverse={false}
                title={"Targeted +2"}
                desc={"A player of your choosing will be forced to draw two cards. Unlike normal draw 2 cards, the player will not lose their turn."}
            />
        </section>
    </>)
}



function SevenORule({ cycleColor }) {
    return (
        <section>
            <h3 class="fancy_title">
                <span>7-0 rule</span>
            </h3>

            <p className="secondary_text paragraph">
                This game mode is almost the same as Classic, with two changes to the following cards:
            </p>
            <br/>

            <FigureCard
                data={{ "color": cycleColor, "type": "7", "choose_swap": true }}
                reverse={false}
                title={"Seven"}
                desc={"7 cards allows you to choose a player to swap hands with."}
            />

            <FigureCard
                data={{ "color": cycleColor, "type": "0", "choose_swap": true }}
                reverse={true}
                title={"Zero"}
                desc={"0 cards force everyone to pass along their hand to the next person, based on the the game's current rotation direction."}
            />
        </section>
    )
}

function FigureCard({ data, title, desc, reverse }) {
    return (
        <figure className={`card_explanation${reverse?" ce_reverse":""}`}>
            <div><Card data={data} /></div>
            <figcaption>
                <h3>{title}</h3>
                <p className="secondary_text">
                    {desc}
                </p>
            </figcaption>
        </figure>
    )
}
