export default function Header() {
    return (
        <header className="container flex flex_center_vertically media_flex">
            {/* Logo */}
            <h1><img src="/LOGO@2x.png" alt="NOT UNO" id="main_logo" /></h1>

            {/* Footer */}
            <footer id="footer_main">
                <div className="inner flex flex_column gap_6px">
                    {/* <a href="https://notkal.com/not-uno" target="_blank" rel="noreferrer"
                        className="button button_primary button_secondary button_mainbg hover_border_shadowed button_border_bg_lighter flex flex_left"
                    >
                        <img src="" alt="" />
                        <span>About</span>
                    </a> */}

                    {/* notkal.com */}
                    <a
                        href="https://notkal.com" target="_blank" rel="noreferrer"
                        className="button button_primary button_secondary button_mainbg hover_border_shadowed button_border_bg_lighter justify_left"
                    >
                        <img src="https://notkal.com/assets/icon.png" alt="" />
                        <span>notkal.com</span>
                    </a>

                    {/* Support */}
                    <a
                        href="https://notkal.com/support" target="_blank" rel="noreferrer"
                        className="button button_primary button_secondary button_support hover_border_shadowed justify_left"
                    >
                        <img src="/promo/ko-fi-cup-border.png" alt="" />
                        <span>
                            Support<br/>
                        </span>
                    </a>
                    <span className="center secondary_text" style={{ fontWeight:"400", fontSize:"10pt" }}>Help cover server costs</span>
                </div>
            </footer>
        </header>
    )
}