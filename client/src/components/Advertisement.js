import { useEffect } from "react";
import { isProduction } from "../socket";
import { useState } from "react";

export default function Advertisement({ adSlot }) {

    // Effects
    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
        catch (e) {}
    }, []);
    
    // Size
    const desktopSize = window.screen.availWidth > 1100;

    // Tall vertical ad (Desktop)
    if(desktopSize) return (
        <ins class="adsbygoogle"
            data-adtest={isProduction ? null : "on"}
            style={{
                display: "block",
                width: "300px",
            }}
            data-ad-client="ca-pub-1407840358707118"
            data-ad-slot="7758224997"
            data-ad-format="auto"
            data-full-width-responsive="true"
        />
    )

    // Wide banner ad (Mobile)
    return (
        <ins class="adsbygoogle"
            // data-adtest={isProduction ? null : "on"}
            style={{
                display: "block",
                width:   "100%",
                height:  "110px"
            }}
            data-ad-client="ca-pub-1407840358707118"
            data-ad-slot="4276337064"
            // data-ad-format="auto"
            // data-full-width-responsive="true"
        />
    )
}
