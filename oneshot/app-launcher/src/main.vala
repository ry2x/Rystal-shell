namespace RyprOneshot {
    public class AppLauncher : Gtk.Application {
        private const string APPLICATION_ID = "io.github.rypr.oneshot.AppLauncher";
        private const int MAX_RESULTS = 30;
        private const int MAX_HISTORY_ENTRIES = 100;

        private Astal.Window? window;
        private Gtk.Entry? search_entry;
        private Gtk.Box? results_list;
        private Gtk.ScrolledWindow? results_scroll;
        private BackgroundImage? background;
        private AstalApps.Apps apps;
        private SharedTheme theme;
        private Gtk.CssProvider? component_css_provider;
        private Gee.ArrayList<AstalApps.Application> results = new Gee.ArrayList<AstalApps.Application>();
        private HashTable<string, double?> history = new HashTable<string, double?>(str_hash, str_equal);
        private int selected_index = 0;

        public AppLauncher () {
            Object(application_id: APPLICATION_ID, flags: ApplicationFlags.HANDLES_COMMAND_LINE);
            apps = new AstalApps.Apps();
            theme = new SharedTheme();
        }

        protected override void startup () {
            base.startup();
            load_component_css();
            load_history();
            build_window();
        }

        private void load_component_css () {
            var display = Gdk.Display.get_default();
            if (display == null) return;

            if (component_css_provider != null) {
                Gtk.StyleContext.remove_provider_for_display(display, component_css_provider);
            }

            var next_provider = new Gtk.CssProvider();
            try {
                var data = resources_lookup_data(
                    "/io/github/rypr/oneshot/app-launcher/style.css",
                    ResourceLookupFlags.NONE
                );
                next_provider.load_from_string("%s\n%s".printf(theme.load_css(), (string) data.get_data()));
            } catch (Error error) {
                warning("Cannot load AppLauncher CSS: %s", error.message);
                return;
            }
            Gtk.StyleContext.add_provider_for_display(
                display,
                next_provider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION + 1
            );
            component_css_provider = next_provider;
        }

        protected override int command_line (ApplicationCommandLine command_line) {
            activate();
            return 0;
        }

        protected override void activate () {
            toggle();
        }

        private void build_window () {
            var builder = new Gtk.Builder.from_resource(
                "/io/github/rypr/oneshot/app-launcher/app-launcher.ui"
            );
            var root = builder.get_object("launcher_root") as Gtk.Box;
            search_entry = builder.get_object("search_entry") as Gtk.Entry;
            var search_container = builder.get_object("search_container") as Gtk.Box;
            results_list = builder.get_object("results_list") as Gtk.Box;
            results_scroll = builder.get_object("results_scroll") as Gtk.ScrolledWindow;
            var left_overlay = builder.get_object("left_overlay") as Gtk.Overlay;

            if (root == null || search_entry == null || search_container == null || results_list == null || results_scroll == null || left_overlay == null) {
                critical("AppLauncher UI could not be loaded");
                return;
            }

            background = new BackgroundImage();
            left_overlay.set_child(background);
            left_overlay.add_overlay(search_container);

            window = new Astal.Window();
            window.add_css_class("applauncher-surface");
            GtkLayerShell.init_for_window(window);
            if (!GtkLayerShell.is_layer_window(window)) {
                warning("Failed to initialize the launcher as a layer-shell window");
            }
            GtkLayerShell.set_layer(window, GtkLayerShell.Layer.OVERLAY);
            GtkLayerShell.set_keyboard_mode(window, GtkLayerShell.KeyboardMode.EXCLUSIVE);
            GtkLayerShell.set_exclusive_zone(window, -1);
            GtkLayerShell.set_namespace(window, "rypr-app-launcher");

            window.application = this;
            window.name = "rypr-app-launcher";
            window.set_child(root);
            add_window(window);
            window.set_visible(false);

            search_entry.changed.connect(() => {
                selected_index = 0;
                refresh_results();
            });
            search_entry.add_controller(create_key_controller());
            root.add_controller(create_close_controller());
            window.notify["visible"].connect(() => on_visibility_changed());
            window.close_request.connect(() => {
                close_and_quit();
                return true;
            });
        }

        private Gtk.EventControllerKey create_key_controller () {
            var controller = new Gtk.EventControllerKey();
            controller.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);
            controller.key_pressed.connect((keyval, keycode, state) => handle_key(keyval));
            return controller;
        }

        private Gtk.EventControllerKey create_close_controller () {
            var controller = new Gtk.EventControllerKey();
            controller.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);
            controller.key_pressed.connect((keyval, keycode, state) => {
                if (keyval != Gdk.Key.Escape) return false;
                close_and_quit();
                return true;
            });
            return controller;
        }

        private bool handle_key (uint keyval) {
            if (keyval == Gdk.Key.Escape) {
                close_and_quit();
                return true;
            }

            var has_query = search_entry != null && search_entry.text.strip() != "";
            var max_index = has_query ? results.size : results.size - 1;
            if (max_index < 0) return false;

            if (keyval == Gdk.Key.Down) {
                selected_index = int.min(selected_index + 1, max_index);
                update_selection();
                return true;
            }
            if (keyval == Gdk.Key.Up) {
                selected_index = int.max(selected_index - 1, 0);
                update_selection();
                return true;
            }
            if (keyval == Gdk.Key.Return || keyval == Gdk.Key.KP_Enter) {
                activate_selection();
                return true;
            }
            return false;
        }

        private void toggle () {
            if (window == null) return;
            if (window.visible) {
                close_and_quit();
                return;
            }
            set_focused_monitor();
            window.set_visible(true);
            // Draw the background after the layer surface is mapped so the
            // Cairo widget has its final allocation.
            Timeout.add(50, () => {
                load_background();
                background?.queue_draw();
                return Source.REMOVE;
            });
        }

        private void set_focused_monitor () {
            var display = Gdk.Display.get_default();
            var hyprland = AstalHyprland.Hyprland.get_default();
            if (display == null || hyprland == null || window == null) return;

            var target_name = hyprland.focused_monitor.name;
            var monitors = display.get_monitors();
            for (uint index = 0; index < monitors.get_n_items(); index++) {
                var monitor = monitors.get_item(index) as Gdk.Monitor;
                if (monitor != null && monitor.get_connector() == target_name) {
                    window.gdkmonitor = monitor;
                    GtkLayerShell.set_monitor(window, monitor);
                    return;
                }
            }
            var fallback_monitor = monitors.get_item(0) as Gdk.Monitor;
            if (fallback_monitor != null) {
                window.gdkmonitor = fallback_monitor;
                GtkLayerShell.set_monitor(window, fallback_monitor);
            }
        }

        private void on_visibility_changed () {
            if (window == null || search_entry == null) return;
            if (!window.visible) {
                search_entry.text = "";
                selected_index = 0;
                return;
            }
            Idle.add(() => {
                search_entry.grab_focus();
                results_scroll?.vadjustment.set_value(0);
                refresh_results();
                return Source.REMOVE;
            });
        }

        private void refresh_results () {
            if (results_list == null || search_entry == null) return;
            results.clear();
            var query = search_entry.text.strip().down();
            var seen = new HashTable<string, bool>(str_hash, str_equal);
            foreach (var app in sorted_apps(query)) {
                var key = app_key(app);
                if (seen.contains(key)) continue;
                seen.insert(key, true);
                results.add(app);
            }

            for (Gtk.Widget? child = results_list.get_first_child(); child != null;) {
                var next = child.get_next_sibling();
                results_list.remove(child);
                child = next;
            }
            foreach (var app in results) results_list.append(create_app_item(app));
            if (query != "") results_list.append(create_web_item(query));
            update_selection();
        }

        private Gee.ArrayList<AstalApps.Application> sorted_apps (string query) {
            var scored = new Gee.ArrayList<AppScore>();
            foreach (var app in apps.list) {
                var score = search_score(app, query);
                if (query != "" && score <= 0) continue;
                scored.add(new AppScore(app, score + history_score(app) * 10));
            }
            scored.sort((a, b) => {
                if (a.score == b.score) return app_text(a.app.name).collate(app_text(b.app.name));
                return a.score > b.score ? -1 : 1;
            });
            var output = new Gee.ArrayList<AstalApps.Application>();
            foreach (var item in scored) {
                output.add(item.app);
                if (output.size == MAX_RESULTS) break;
            }
            return output;
        }

        private double search_score (AstalApps.Application app, string query) {
            if (query == "") return 0;
            var name = app_text(app.name).down();
            var description = app_text(app.description).down();
            var executable = app_text(app.executable).down();
            var text = "%s %s %s".printf(name, description, executable);
            foreach (var term in query.split(" ")) {
                if (term != "" && !text.contains(term)) return 0;
            }
            if (name.has_prefix(query)) return 100;
            if (name.contains(query)) return 50;
            if (executable.contains(query)) return 30;
            return description.contains(query) ? 10 : 0;
        }

        private Gtk.Button create_app_item (AstalApps.Application app) {
            var button = new Gtk.Button();
            button.add_css_class("applauncher-item");
            button.can_focus = false;
            var row = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 12);
            var image = new Gtk.Image();
            image.add_css_class("applauncher-item-icon");
            var icon_name = app_text(app.icon_name);
            if (icon_name.has_prefix("/")) image.set_from_file(icon_name);
            else image.set_from_icon_name(icon_name != "" ? icon_name : "application-x-executable");
            var name = new Gtk.Label(app_text(app.name));
            name.halign = Gtk.Align.START;
            name.add_css_class("applauncher-item-name");
            var description_text = app_text(app.description).strip();
            Gtk.Widget text_widget;
            if (description_text != "") {
                var labels = new Gtk.Box(Gtk.Orientation.VERTICAL, 0);
                labels.valign = Gtk.Align.CENTER;
                labels.append(name);
                var description = new Gtk.Label(description_text);
                description.halign = Gtk.Align.START;
                description.ellipsize = Pango.EllipsizeMode.END;
                description.max_width_chars = 40;
                description.add_css_class("applauncher-item-desc");
                labels.append(description);
                text_widget = labels;
            } else {
                name.valign = Gtk.Align.CENTER;
                text_widget = name;
            }
            row.append(image);
            row.append(text_widget);
            button.set_child(row);
            button.clicked.connect(() => launch_app(app));
            return button;
        }

        private Gtk.Button create_web_item (string query) {
            var button = new Gtk.Button();
            button.add_css_class("applauncher-item");
            button.can_focus = false;
            var is_url = direct_url(query) != null;
            var row = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 12);
            var image = new Gtk.Image.from_icon_name("web-browser");
            image.add_css_class("applauncher-item-icon");
            var labels = new Gtk.Box(Gtk.Orientation.VERTICAL, 0);
            labels.valign = Gtk.Align.CENTER;
            var name = new Gtk.Label(
                is_url ? "Open \"%s\"".printf(query) : "Search \"%s\"".printf(query)
            );
            name.halign = Gtk.Align.START;
            name.ellipsize = Pango.EllipsizeMode.END;
            name.add_css_class("applauncher-item-name");
            var description = new Gtk.Label(is_url ? "Open URL" : "Search on Google");
            description.halign = Gtk.Align.START;
            description.add_css_class("applauncher-item-desc");
            labels.append(name);
            labels.append(description);
            row.append(image);
            row.append(labels);
            button.set_child(row);
            button.clicked.connect(() => open_query(query));
            return button;
        }

        private void update_selection () {
            if (results_list == null) return;
            var index = 0;
            Gtk.Widget? selected = null;
            for (Gtk.Widget? child = results_list.get_first_child(); child != null; child = child.get_next_sibling()) {
                if (index == selected_index) {
                    child.add_css_class("selected");
                    selected = child;
                } else {
                    child.remove_css_class("selected");
                }
                index++;
            }
            if (selected != null) ensure_visible(selected);
        }

        private void ensure_visible (Gtk.Widget target) {
            if (results_list == null || results_scroll == null) return;

            var adjustment = results_scroll.get_vadjustment();
            double content_x;
            double content_y;
            if (!target.translate_coordinates(results_list, 0, 0, out content_x, out content_y)) return;

            var current_top = adjustment.value;
            var current_bottom = current_top + adjustment.page_size;
            var item_top = content_y;
            var item_bottom = item_top + target.get_height();
            var next_value = current_top;

            if (item_top < current_top) {
                next_value = item_top - 10;
            } else if (item_bottom > current_bottom) {
                next_value = item_bottom - adjustment.page_size + 10;
            } else {
                return;
            }

            var maximum = adjustment.upper - adjustment.page_size;
            adjustment.value = double.min(double.max(next_value, adjustment.lower), maximum);
        }

        private void activate_selection () {
            if (search_entry == null) return;
            if (selected_index < results.size) launch_app(results[selected_index]);
            else if (search_entry.text.strip() != "") open_query(search_entry.text.strip());
        }

        private void launch_app (AstalApps.Application app) {
            close_and_quit();
            record_launch(app);
            app.launch();
        }

        private void open_query (string query) {
            close_and_quit();
            var url = direct_url(query);
            if (url == null) url = "https://google.com/search?q=%s".printf(Uri.escape_string(query));
            try { Process.spawn_command_line_async("xdg-open %s".printf(Shell.quote(url))); }
            catch (Error error) { warning("Cannot open query: %s", error.message); }
        }

        private void close_and_quit () {
            window?.set_visible(false);
            quit();
        }

        private string? direct_url (string query) {
            try {
                var http = new Regex("^https?://[^\\s]+$", RegexCompileFlags.CASELESS);
                var domain = new Regex("^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,}(?::\\d{1,5})?(?:[/?#][^\\s]*)?$", RegexCompileFlags.CASELESS);
                if (http.match(query)) return query;
                if (domain.match(query)) return "https://%s".printf(query);
            } catch (RegexError error) { warning("Invalid URL regex: %s", error.message); }
            return null;
        }

        private string app_key (AstalApps.Application app) {
            var entry = app_text(app.entry);
            var executable = app_text(app.executable);
            return entry != "" ? entry : (executable != "" ? executable : app_text(app.name));
        }

        private string app_text (string? value) {
            return value ?? "";
        }

        private double history_score (AstalApps.Application app) {
            return history.lookup(app_key(app)) ?? 0;
        }

        private string history_path () {
            return Path.build_filename(Environment.get_user_cache_dir(), "ags", "app_history.json");
        }

        private void load_history () {
            try {
                var parser = new Json.Parser();
                parser.load_from_file(history_path());
                var root = parser.get_root();
                var object = root != null ? root.get_object() : null;
                var scores = object != null && object.has_member("scores") ? object.get_object_member("scores") : null;
                if (scores == null) return;
                foreach (var key in scores.get_members()) history.insert(key, scores.get_double_member(key));
            } catch (Error error) {
                debug("No app history loaded: %s", error.message);
            }
        }

        private void record_launch (AstalApps.Application app) {
            var keys = new Gee.ArrayList<string>();
            foreach (var key in history.get_keys()) keys.add(key);
            foreach (var key in keys) history.insert(key, (history.lookup(key) ?? 0) * 0.99);
            var key = app_key(app);
            history.insert(key, (history.lookup(key) ?? 0) + 1);
            save_history();
        }

        private void save_history () {
            try {
                var directory = Path.get_dirname(history_path());
                DirUtils.create_with_parents(directory, 0700);
                var scores = new Json.Object();
                var entries = new Gee.ArrayList<string>();
                foreach (var key in history.get_keys()) entries.add(key);
                entries.sort((a, b) => (history.lookup(a) ?? 0) > (history.lookup(b) ?? 0) ? -1 : 1);
                var count = 0;
                foreach (var key in entries) {
                    if (count++ >= MAX_HISTORY_ENTRIES) break;
                    scores.set_double_member(key, history.lookup(key) ?? 0);
                }
                var root_object = new Json.Object();
                root_object.set_int_member("version", 2);
                root_object.set_object_member("scores", scores);
                var root = new Json.Node(Json.NodeType.OBJECT);
                root.set_object(root_object);
                var generator = new Json.Generator();
                generator.set_root(root);
                generator.to_file(history_path());
            } catch (Error error) {
                warning("Cannot save app history: %s", error.message);
            }
        }

        private void load_background () {
            if (background == null) return;
            var path = Path.build_filename(Environment.get_user_config_dir(), "ags", "assets", "launcher_bg.png");
            background.load(path);
        }
    }

    private class BackgroundImage : Gtk.DrawingArea {
        private Cairo.ImageSurface? surface;

        public BackgroundImage () {
            hexpand = true;
            vexpand = true;
            halign = Gtk.Align.FILL;
            valign = Gtk.Align.FILL;
            set_draw_func((area, context, width, height) => {
                draw_cover(context, width, height);
            });
        }

        public void load (string path) {
            surface = new Cairo.ImageSurface.from_png(path);
            if (surface.status() != Cairo.Status.SUCCESS) {
                warning("Cannot load launcher background: %s", path);
                surface = null;
                return;
            }
            queue_draw();
        }

        private void draw_cover (Cairo.Context context, int width, int height) {
            if (surface == null || width <= 0 || height <= 0) return;

            var image_width = surface.get_width();
            var image_height = surface.get_height();
            var scale = double.max(
                (double) width / image_width,
                (double) height / image_height
            );
            var draw_width = image_width * scale;
            var draw_height = image_height * scale;

            context.save();
            context.rectangle(0, 0, width, height);
            context.clip();
            context.translate((width - draw_width) / 2, (height - draw_height) / 2);
            context.scale(scale, scale);
            context.set_source_surface(surface, 0, 0);
            context.paint();
            context.restore();
        }
    }

    private class AppScore : Object {
        public AstalApps.Application app;
        public double score;
        public AppScore (AstalApps.Application app, double score) {
            this.app = app;
            this.score = score;
        }
    }

    public static int main (string[] args) {
        return new AppLauncher().run(args);
    }
}
