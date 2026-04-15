import { isProduction } from "../socket"

export default function Footer({ setMenu }) {
    return (
        <footer id="footer" className="container">
            {/* Button links */}
            <div className="flex flex_wrap gap_12px flex_center_horizontally">
                {/* Tutorial */}
                <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed button_mini" onClick={() => setMenu("help")}>
                    <span>?</span>
                    How to play
                </button>

                {/* Changelog */}
                <a href="https://notkal.com/posts/not-uno-changelog" target="_blank" rel="noreferrer"
                    className="button button_primary button_secondary button_mainbg hover_border_shadowed button_border_bg_lighter button_mini"
                >
                    <img src="/icons/reverse.png" alt="" className="parent_invert" />
                    <span>Changelog</span>
                </a>

                {/* Feedback */}
                <a href="https://notkal.com/#contact" target="_blank" rel="noreferrer"
                    className="button button_primary button_secondary button_mainbg hover_border_shadowed button_border_bg_lighter button_mini"
                >
                    <img src="/icons/chat.svg" alt="" className="parent_invert" />
                    <span>Feedback</span>
                </a>

                {/* Open deck builder */}
                {isProduction ? null :
                    <button className="button_primary button_secondary button_mainbg button_border_bg_lighter hover_border_shadowed button_mini" onClick={() => setMenu("deck_editor")}>
                        Custom Decks (WIP)
                    </button>
                }
            </div>

            <br/>

            {/* Description */}
            <div className="center">
                <p className="secondary_text">Play UNO online with friends!</p>

                {/* Links */}
                <a href="https://notkal.com/about/#privacy" target="_blank" rel="noreferrer noopener" className="button hover_underline">Privacy</a>
            </div>
        </footer>
    )
}
