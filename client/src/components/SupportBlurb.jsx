import { useState } from "react";

export default function SupportBlurb() {

    const [hide, setHide] = useState(sessionStorage.getItem("hide_support_blurb") ? true : false);

    function hideSupportBlurbs() {
        sessionStorage.setItem("hide_support_blurb", 1);
        setHide(true);
    }

    // Hidden
    if(hide) return null;

    // JSX
    return (
        <div className="inner flex media_flex gap_12px win_screen_support_blurb">
            {/* Left */}
            <div>
                <h4 className="border_shadowed">Support NOT UNO</h4>
                <p className="secondary_text">Help cover server costs by leaving a tip</p>
            </div>

            {/* Button */}
            <div className="margin_left_auto flex flex_center flex_column">
                <a
                    href="https://support.notkal.com/" target="_blank" rel="noreferrer"
                    className="button button_primary button_secondary button_support hover_border_shadowed button_mini"
                >
                    <img src="/promo/ko-fi-cup-border.png" alt="" />
                    <span>
                        Support<br/>
                    </span>
                </a>
                <p className="smaller hover_underline cursor_pointer secondary_text margin_left_auto" role="button" tabIndex="0" style={{ marginTop:"6px", marginRight:"5px" }} onClick={hideSupportBlurbs}>
                    Dismiss
                </p>
            </div>
        </div>
    )
}
