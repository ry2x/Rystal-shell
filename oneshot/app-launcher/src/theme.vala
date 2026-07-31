namespace RyprOneshot {
    public class SharedTheme : Object {
        private const string FALLBACK_CSS = """
            @define-color window_bg_color #1d1b20;
            @define-color window_fg_color #e6e1e5;
            @define-color card_bg_color #2b2930;
            @define-color accent_color #d0bcff;
            @define-color accent_fg_color #381e72;
        """;

        private string css_path;

        public SharedTheme () {
            css_path = Path.build_filename(Environment.get_user_config_dir(), "ags", "oneshot", "style.css");
        }

        public string load_css () {
            try {
                string loaded_css;
                if (FileUtils.get_contents(css_path, out loaded_css)) return loaded_css;
            } catch (Error error) {
                warning("Cannot load one-shot CSS: %s", error.message);
            }
            return FALLBACK_CSS;
        }
    }
}
