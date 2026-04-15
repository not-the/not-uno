export default function Header() {
    return (
        <header className="container flex flex_center_vertically media_flex">
            {/* Logo */}
            <h1><img src="/LOGO@2x.png" alt="NOT UNO" id="main_logo" /></h1>

            {/* Footer */}
            <footer id="footer_main">
                <div className="inner flex flex_column gap_6px flex_wrap media_flex_inverse">
                    {/* <a href="https://notkal.com/not-uno" target="_blank" rel="noreferrer"
                        className="button button_primary button_secondary button_mainbg hover_border_shadowed button_border_bg_lighter flex flex_left"
                    >
                        <img src="" alt="" />
                        <span>About</span>
                    </a> */}

                    {/* notkal.com */}
                    <div>
                        <a
                            href="https://notkal.com" target="_blank" rel="noreferrer"
                            className="button button_primary button_secondary button_mainbg hover_border_shadowed button_border_bg_lighter justify_left"
                        >
                            <img src="https://notkal.com/assets/icon.png" alt="" />
                            <span>notkal.com</span>
                        </a>
                    </div>

                    {/* Discord */}
                    <div>
                        <a
                            href="https://discord.notkal.com/" target="_blank" rel="noreferrer"
                            className="button button_primary button_secondary button_discord hover_border_shadowed justify_left"
                        >
                            <img src="/promo/Discord-Symbol-White.svg" alt="" className="parent_invert" />
                            <span>
                                Discord
                            </span>
                        </a>
                    </div>

                    
                    {/* Support */}
                    <div className="flex flex_column gap_6px flex_center_horizontally">
                        <a
                            href="https://support.notkal.com/" target="_blank" rel="noreferrer"
                            className="button button_primary button_secondary button_support hover_border_shadowed justify_left"
                        >
                            <img src="/promo/ko-fi-cup-border.png" alt="" />
                            <span>
                                Support
                            </span>
                        </a>
                        <span className="center smaller secondary_text">Help cover server costs</span>
                    </div>

                </div>
            </footer>
        </header>
    )
}