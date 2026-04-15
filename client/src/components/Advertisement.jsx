import { useEffect } from "react";
import { isProduction } from "../socket";

export default function Advertisement() {

    // Effects
    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
        catch (e) {}
    }, []);


    // Disabled
    if (
        !import.meta.env.VITE_APP_ADSENSE_CLIENT
        || !import.meta.env.VITE_APP_ADSENSE_SLOT_DESKTOP
        || !import.meta.env.VITE_APP_ADSENSE_SLOT_MOBILE
    ) {
        return 'Ads are disabled'
    }
    
    // Size
    const desktopSize = window.screen.availWidth > 1100;

    // Tall vertical ad (Desktop)
    if(desktopSize) return (
        <ins className="adsbygoogle"
            data-adtest={isProduction ? null : "on"}
            style={{
                display: "block",
                width: "300px",
            }}
            data-ad-client={import.meta.env.VITE_APP_ADSENSE_CLIENT}
            data-ad-slot={import.meta.env.VITE_APP_ADSENSE_SLOT_DESKTOP}
            data-ad-format="auto"
            data-full-width-responsive="true"
        />
    )

    // Wide banner ad (Mobile)
    return (
        <ins className="adsbygoogle"
            data-adtest={isProduction ? null : "on"}
            style={{
                display: "block",
                width:   "100%",
                height:  "110px"
            }}
            data-ad-client={import.meta.env.VITE_APP_ADSENSE_CLIENT}
            data-ad-slot={import.meta.env.VITE_APP_ADSENSE_SLOT_MOBILE}
            // data-ad-format="auto"
            // data-full-width-responsive="true"
        />
    )
}
