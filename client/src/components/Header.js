export default function Header() {
    return (
        <header className="container flex flex_center_vertically media_flex">
            {/* Logo */}
            <h1><img src="/LOGO@2x.png" alt="NOT UNO" id="main_logo" /></h1>

            {/* Footer */}
            <footer id="footer_main">
                <div className="inner">
                    <a href="https://notkal.com/not-uno" target="_blank" rel="noreferrer"
                        className="button button_primary button_secondary button_mainbg hover_border_shadowed button_border_bg_lighter flex flex_left"
                    >
                        <img src="" alt="" />
                        <span>About</span>
                    </a>
                    <a href="https://notkal.com" target="_blank" rel="noreferrer"
                        className="button button_primary button_secondary button_mainbg hover_border_shadowed button_border_bg_lighter flex flex_left"
                    >
                        <img src="https://notkal.com/assets/icon.png" alt="" />
                        <span>notkal.com</span>
                    </a>
                </div>
            </footer>
        </header>
    )
}