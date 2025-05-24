import { useEffect } from "react";
import { isProduction } from "../socket";
import { useState } from "react";

export default function Advertisement({ adSlot }) {

    // const [adsEnabled, setAdsEnabled] = useState(localStorage.getItem("notuno_allow_ads") === "false" ? false : true);

    // Effects
    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
        catch (e) {}
    }, []);


    // function disable() {
    //     setAdsEnabled(false);
    //     localStorage.setItem("notuno_allow_ads", "false");
    // }


    // Disabled
    // if(!adsEnabled) return null;

    // HTML
    return <div>
        <ins class="adsbygoogle"
            data-adtest={isProduction ? null : "on"}
            style={{
                display: "block",
                width:   "728px",
                height:  "90px"
            }}
            data-ad-client="ca-pub-1407840358707118"
            data-ad-slot={adSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
        />

        {/* <button className="ad_disable_btn" onClick={disable}>
            Disable ads
        </button> */}
    </div>
}
