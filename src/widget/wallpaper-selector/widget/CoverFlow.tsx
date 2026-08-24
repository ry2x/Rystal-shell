import {Gtk} from 'ags/gtk4';

import GLib from 'gi://GLib';

import {
  type Wallpaper,
  applyWallpaper,
  wallpaperApplying,
  wallpaperError,
  wallpapers,
  wallpapersLoading,
} from '@/stores/wallpaper/wallpaper';
import {
  ensureWallpaperThumbnails,
  subscribeThumbnailReady,
} from '@/stores/wallpaper/wallpaperThumbnail';
import {
  createCoverFlowTransform,
  getCoverFlowOpacity,
} from '@/widget/wallpaper-selector/coverFlowGeometry';
import {WallpaperCardController} from '@/widget/wallpaper-selector/widget/WallpaperCard';
import {
  CoverFlowAnimation,
  type CoverFlowCardState,
} from '@/widget/wallpaper-selector/widget/coverFlowAnimation';

const VISIBLE_RADIUS = 3;
const PREFETCH_RADIUS = 4;
const MOVE_INTERVAL_US = 83_333;
const VIEWPORT_HEIGHT = 420;

export interface CoverFlowOptions {
  onApplied: () => void;
  viewportWidth: number;
}

export default class CoverFlowController {
  readonly widget: Gtk.Box;

  private readonly fixed: Gtk.Fixed;
  private readonly positionLabel: Gtk.Label;
  private readonly statusLabel: Gtk.Label;
  private readonly cards = new Map<string, CoverFlowCardState>();
  private readonly disposers: (() => void)[];
  private readonly animation: CoverFlowAnimation;
  private active = false;
  private disposed = false;
  private filtered: Wallpaper[] = [];
  private selectedIndex = 0;
  private lastMoveAt = 0;

  constructor(private readonly options: CoverFlowOptions) {
    this.fixed = new Gtk.Fixed({
      hexpand: false,
      vexpand: false,
      widthRequest: options.viewportWidth,
      heightRequest: VIEWPORT_HEIGHT,
      overflow: Gtk.Overflow.VISIBLE,
    });

    const viewport = new Gtk.ScrolledWindow({
      hscrollbarPolicy: Gtk.PolicyType.NEVER,
      vscrollbarPolicy: Gtk.PolicyType.NEVER,
      propagateNaturalWidth: false,
      propagateNaturalHeight: false,
      widthRequest: options.viewportWidth,
      heightRequest: VIEWPORT_HEIGHT,
      halign: Gtk.Align.FILL,
      valign: Gtk.Align.FILL,
      child: this.fixed,
    });

    this.positionLabel = new Gtk.Label({
      cssClasses: ['wallpaper-path'],
      canTarget: false,
      hexpand: false,
      halign: Gtk.Align.CENTER,
      valign: Gtk.Align.END,
      marginBottom: 48,
      xalign: 0.5,
    });

    this.statusLabel = new Gtk.Label({cssClasses: ['wallpaper-status'], xalign: 0.5});

    const coverFlowLayer = new Gtk.Overlay({
      cssClasses: ['wallpaper-coverflow'],
      widthRequest: options.viewportWidth,
      heightRequest: VIEWPORT_HEIGHT,
      hexpand: false,
      vexpand: false,
      halign: Gtk.Align.CENTER,
      valign: Gtk.Align.CENTER,
      overflow: Gtk.Overflow.VISIBLE,
      child: new Gtk.Box({
        widthRequest: options.viewportWidth,
        heightRequest: VIEWPORT_HEIGHT,
        hexpand: false,
        vexpand: false,
      }),
    });
    coverFlowLayer.add_overlay(viewport);
    coverFlowLayer.add_overlay(this.positionLabel);

    this.widget = (
      <box
        class="wallpaper-selector-content"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={8}
        hexpand
        halign={Gtk.Align.FILL}
      >
        {coverFlowLayer}
        {this.statusLabel}
      </box>
    ) as Gtk.Box;

    this.animation = new CoverFlowAnimation({
      fixed: this.fixed,
      cards: this.cards,
      onVisualsUpdated: () => this.applyCardVisuals(),
      onFinished: () => this.finishAnimation(),
    });

    const scrollController = new Gtk.EventControllerScroll({
      flags: Gtk.EventControllerScrollFlags.VERTICAL | Gtk.EventControllerScrollFlags.DISCRETE,
    });
    scrollController.connect('scroll', (_controller, _dx, dy) => {
      if (dy !== 0) this.moveSelection(dy > 0 ? 1 : -1);
      return true;
    });
    this.fixed.add_controller(scrollController);

    this.disposers = [
      wallpapers.subscribe(() => {
        if (this.active) this.filterWallpapers();
      }),
      wallpaperError.subscribe(() => this.updateLabels()),
      wallpapersLoading.subscribe(() => this.updateLabels()),
      subscribeThumbnailReady(path => this.cards.get(path)?.card.refreshImage()),
    ];
    this.widget.connect('destroy', () => this.dispose());
  }

  setActive(active: boolean) {
    if (this.disposed || this.active === active) return;
    this.active = active;

    if (active) {
      this.lastMoveAt = 0;
      this.animation.resetEntrance();
      this.filterWallpapers();
      this.startAnimation();
      return;
    }

    this.stopAnimation();
    for (const [path, state] of [...this.cards]) this.removeCard(path, state);
  }

  moveSelection(delta: number) {
    if (!this.active || wallpaperApplying()) return;
    const now = GLib.get_monotonic_time();
    if (now - this.lastMoveAt < MOVE_INTERVAL_US) return;
    this.lastMoveAt = now;
    this.setSelection(this.selectedIndex + delta);
  }

  activateSelection() {
    const selected = this.selectedWallpaper();
    if (!selected || wallpaperApplying()) return;
    this.options.onApplied();
    void applyWallpaper(selected);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.active = false;
    this.stopAnimation();
    for (const dispose of this.disposers) dispose();
    for (const [path, state] of [...this.cards]) this.removeCard(path, state);
  }

  private selectedWallpaper() {
    return this.filtered[this.selectedIndex] ?? null;
  }

  private handleCardClicked(card: WallpaperCardController) {
    const clicked = card.wallpaper;
    if (!clicked || wallpaperApplying()) return;
    const index = this.filtered.findIndex(item => item.path === clicked.path);
    if (index < 0) return;
    if (index === this.selectedIndex) this.activateSelection();
    else this.setSelection(index);
  }

  private updateLabels() {
    const selected = this.selectedWallpaper();
    this.positionLabel.set_label(
      selected ? `${this.selectedIndex + 1} / ${this.filtered.length}` : '0 / 0'
    );
    this.statusLabel.set_label(
      wallpaperError() || (wallpapersLoading() ? 'Loading wallpapers…' : '')
    );
    this.statusLabel.set_visible(Boolean(this.statusLabel.get_label()));
  }

  private removeCard(path: string, state: CoverFlowCardState) {
    state.card.clear();
    this.fixed.remove(state.card.widget);
    this.cards.delete(path);
  }

  private applyCardVisuals() {
    const ordered = [...this.cards.values()].sort(
      (a, b) => Math.abs(b.currentOffset) - Math.abs(a.currentOffset)
    );

    for (const state of ordered) {
      state.card.setSelected(Math.abs(state.currentOffset) < 0.5);
      state.card.widget.set_can_target(Math.abs(state.currentOffset) <= VISIBLE_RADIUS + 0.25);
      this.fixed.set_child_transform(
        state.card.widget,
        createCoverFlowTransform(
          state.currentOffset,
          this.options.viewportWidth,
          this.animation.getEntrance()
        )
      );
      state.card.widget.insert_before(this.fixed, null);
    }
  }

  private finishAnimation() {
    for (const [path, state] of this.cards) {
      state.currentOffset = state.targetOffset;
      state.currentOpacity = state.targetOpacity;
      if (!state.retained) this.removeCard(path, state);
      else {
        state.card.widget.set_opacity(
          getCoverFlowOpacity(state.currentOffset) *
            state.currentOpacity *
            this.animation.getEntrance()
        );
      }
    }
    this.applyCardVisuals();
  }

  private startAnimation() {
    if (!this.active) return;
    this.animation.start();
  }

  private stopAnimation() {
    this.animation.stop();
  }

  private reconcileCards(direction = 0) {
    for (const [path, state] of [...this.cards]) {
      if (!state.retained) this.removeCard(path, state);
    }

    for (const state of this.cards.values()) {
      state.retained = false;
      state.startOffset = state.currentOffset;
      state.startOpacity = state.currentOpacity;
      state.targetOpacity = 0;
      state.targetOffset = state.currentOffset - (direction || Math.sign(state.currentOffset) || 1);
    }

    const visibleItems: Wallpaper[] = [];
    for (let offset = -PREFETCH_RADIUS; offset <= PREFETCH_RADIUS; offset++) {
      const wallpaper = this.filtered[this.selectedIndex + offset];
      if (!wallpaper) continue;
      visibleItems.push(wallpaper);

      let state = this.cards.get(wallpaper.path);
      if (!state) {
        const card = new WallpaperCardController(clicked => this.handleCardClicked(clicked));
        card.bind(wallpaper);
        this.fixed.put(card.widget, 0, 0);
        const spawnOffset = offset + Math.sign(offset || direction || 1) * 0.35;
        state = {
          card,
          currentOffset: spawnOffset,
          startOffset: spawnOffset,
          targetOffset: offset,
          currentOpacity: 0,
          startOpacity: 0,
          targetOpacity: 1,
          retained: true,
        };
        this.cards.set(wallpaper.path, state);
      } else {
        state.retained = true;
        state.targetOffset = offset;
        state.targetOpacity = 1;
      }
    }

    ensureWallpaperThumbnails(visibleItems, true);
    this.updateLabels();
    this.startAnimation();
  }

  private setSelection(index: number) {
    if (this.filtered.length === 0) {
      this.selectedIndex = 0;
      this.reconcileCards();
      return;
    }
    const nextIndex = Math.max(0, Math.min(this.filtered.length - 1, index));
    if (nextIndex === this.selectedIndex && this.cards.size > 0) return;
    const direction = Math.sign(nextIndex - this.selectedIndex);
    this.selectedIndex = nextIndex;
    this.reconcileCards(direction);
  }

  private filterWallpapers() {
    const previousPath = this.selectedWallpaper()?.path;
    this.filtered = wallpapers();
    const preservedIndex = previousPath
      ? this.filtered.findIndex(wallpaper => wallpaper.path === previousPath)
      : -1;
    this.selectedIndex = preservedIndex >= 0 ? preservedIndex : 0;
    this.reconcileCards();
  }
}
