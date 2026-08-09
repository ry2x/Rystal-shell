import { Gtk } from 'ags/gtk4';

import GLib from 'gi://GLib';
import Graphene from 'gi://Graphene';
import Gsk from 'gi://Gsk';

import {
  Wallpaper,
  applyWallpaper,
  ensureWallpaperThumbnails,
  subscribeThumbnailReady,
  wallpaperApplying,
  wallpaperError,
  wallpapers,
  wallpapersLoading,
} from '../../../services/wallpapers';
import { WallpaperCardController, createWallpaperCard } from './WallpaperCard';

const CARD_WIDTH = 384;
const CARD_HEIGHT = 252;
const VISIBLE_RADIUS = 3;
const PREFETCH_RADIUS = 4;
const MOVE_DURATION_US = 320_000;
const MOVE_INTERVAL_US = 83_333;

type CardState = {
  card: WallpaperCardController;
  currentOffset: number;
  startOffset: number;
  targetOffset: number;
  currentOpacity: number;
  startOpacity: number;
  targetOpacity: number;
  retained: boolean;
};

export type CoverFlowController = {
  widget: Gtk.Widget;
  setActive: (active: boolean) => void;
  moveSelection: (delta: number) => void;
  activateSelection: () => void;
};

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function interpolateStops(distance: number, values: number[]) {
  const clamped = Math.min(distance, values.length - 1);
  const lower = Math.floor(clamped);
  const upper = Math.min(values.length - 1, lower + 1);
  return values[lower] + (values[upper] - values[lower]) * (clamped - lower);
}

function visualOpacity(offset: number) {
  // Keep overlapping cards opaque so wallpapers behind them cannot bleed
  // through and look like a stale, front-facing texture.
  return interpolateStops(Math.abs(offset), [1, 1, 1, 0.85, 0]);
}

function createTransform(offset: number, containerWidth: number, entrance: number) {
  const distance = Math.abs(offset);
  const direction = Math.sign(offset);
  const horizontal = distance <= 1 ? distance * 290 : 290 + (distance - 1) * 190;
  const scale = interpolateStops(distance, [1.06, 0.88, 0.76, 0.64, 0.56]);
  const skew = direction * interpolateStops(distance, [0, -9, -12, -14, -16]);
  const arcDrop = interpolateStops(distance, [-14, 24, 62, 108, 152]);
  const x = (containerWidth - CARD_WIDTH) / 2 + direction * horizontal;
  const y = 52 + arcDrop + (1 - entrance) * 70;

  let transform: Gsk.Transform | null = Gsk.Transform.new();
  transform = transform.translate(new Graphene.Point({ x, y }));
  transform = transform!.translate(new Graphene.Point({ x: CARD_WIDTH / 2, y: CARD_HEIGHT / 2 }));
  // A 2D skew preserves the cover-flow silhouette without sending animated
  // pictures through Vulkan's glitch-prone projective texture path.
  transform = transform!.skew(skew, 0);
  transform = transform!.scale(scale, scale);
  transform = transform!.translate(new Graphene.Point({ x: -CARD_WIDTH / 2, y: -CARD_HEIGHT / 2 }));
  return transform;
}

export function createCoverFlow(onApplied: () => void, viewportWidth: number): CoverFlowController {
  const fixed = new Gtk.Fixed({ hexpand: false, vexpand: false });
  fixed.set_size_request(viewportWidth, 420);
  fixed.set_overflow(Gtk.Overflow.VISIBLE);

  // Gtk.Fixed includes transformed children in its natural bounds. Isolate it
  // from the surrounding layout so cards leaving the flow cannot move the
  // labels and toolbar while an animation is running.
  const viewport = Object.assign(new Gtk.ScrolledWindow(), {
    hscrollbarPolicy: Gtk.PolicyType.NEVER,
    vscrollbarPolicy: Gtk.PolicyType.NEVER,
    propagateNaturalWidth: false,
    propagateNaturalHeight: false,
    widthRequest: viewportWidth,
    heightRequest: 420,
    child: fixed,
  }) as Gtk.ScrolledWindow;
  const positionLabel = new Gtk.Label({
    cssClasses: ['wallpaper-path'],
    canTarget: false,
    hexpand: true,
    halign: Gtk.Align.FILL,
    valign: Gtk.Align.END,
    marginBottom: 48,
    xalign: 0.5,
  });
  const statusLabel = new Gtk.Label({ cssClasses: ['wallpaper-status'], xalign: 0.5 });
  const coverFlowAnchor = new Gtk.Box({
    widthRequest: viewportWidth,
    heightRequest: 420,
    hexpand: false,
    vexpand: false,
  });
  const coverFlowLayer = new Gtk.Overlay({
    cssClasses: ['wallpaper-coverflow'],
    widthRequest: viewportWidth,
    heightRequest: 420,
    hexpand: false,
    vexpand: false,
    halign: Gtk.Align.CENTER,
    valign: Gtk.Align.CENTER,
    overflow: Gtk.Overflow.VISIBLE,
    child: coverFlowAnchor,
  });
  viewport.set_halign(Gtk.Align.FILL);
  viewport.set_valign(Gtk.Align.FILL);
  coverFlowLayer.add_overlay(viewport);
  coverFlowLayer.add_overlay(positionLabel);

  let active = false;
  let filtered: Wallpaper[] = [];
  let selectedIndex = 0;
  let tickId = 0;
  let animationStartedAt = 0;
  let lastMoveAt = 0;
  let entrance = 0;
  let entranceStart = 0;
  const cards = new Map<string, CardState>();

  const selectedWallpaper = () => filtered[selectedIndex] ?? null;

  function moveSelection(delta: number) {
    if (!active || wallpaperApplying.get()) return;
    const now = GLib.get_monotonic_time();
    if (now - lastMoveAt < MOVE_INTERVAL_US) return;
    lastMoveAt = now;
    setSelection(selectedIndex + delta);
  }

  function activateSelection() {
    const selected = selectedWallpaper();
    if (!selected || wallpaperApplying.get()) return;
    onApplied();
    void applyWallpaper(selected);
  }

  function handleCardClicked(clickedCard: WallpaperCardController) {
    const clicked = clickedCard.wallpaper;
    if (!clicked || wallpaperApplying.get()) return;
    const index = filtered.findIndex((item) => item.path === clicked.path);
    if (index < 0) return;
    if (index === selectedIndex) void activateSelection();
    else setSelection(index);
  }

  function updateLabels() {
    const selected = selectedWallpaper();
    positionLabel.set_label(selected ? `${selectedIndex + 1} / ${filtered.length}` : '0 / 0');
    statusLabel.set_label(
      wallpaperError.get() || (wallpapersLoading.get() ? 'Loading wallpapers…' : ''),
    );
    statusLabel.set_visible(Boolean(statusLabel.get_label()));
  }

  function removeCard(path: string, state: CardState) {
    state.card.clear();
    fixed.remove(state.card.widget);
    cards.delete(path);
  }

  function applyCardVisuals() {
    const ordered = [...cards.values()].sort(
      (a, b) => Math.abs(b.currentOffset) - Math.abs(a.currentOffset),
    );

    for (const state of ordered) {
      const selected = Math.abs(state.currentOffset) < 0.5;
      state.card.setSelected(selected);
      state.card.widget.set_can_target(Math.abs(state.currentOffset) <= VISIBLE_RADIUS + 0.25);
      fixed.set_child_transform(
        state.card.widget,
        createTransform(state.currentOffset, viewportWidth, entrance),
      );
      state.card.widget.insert_before(fixed, null);
    }
  }

  function finishAnimation() {
    for (const [path, state] of cards) {
      state.currentOffset = state.targetOffset;
      state.currentOpacity = state.targetOpacity;
      if (!state.retained) removeCard(path, state);
      else {
        state.card.widget.set_opacity(
          visualOpacity(state.currentOffset) * state.currentOpacity * entrance,
        );
      }
    }
    applyCardVisuals();
  }

  function startAnimation() {
    if (!active) return;
    animationStartedAt = GLib.get_monotonic_time();
    if (tickId !== 0) return;

    tickId = fixed.add_tick_callback((_widget, frameClock) => {
      const now = frameClock.get_frame_time();
      const moveProgress = Math.min(1, (now - animationStartedAt) / MOVE_DURATION_US);
      const eased = easeOutCubic(moveProgress);
      if (entrance < 1) {
        entrance = easeOutCubic(Math.min(1, (now - entranceStart) / 420_000));
      }

      for (const state of cards.values()) {
        state.currentOffset = state.startOffset + (state.targetOffset - state.startOffset) * eased;
        state.currentOpacity =
          state.startOpacity + (state.targetOpacity - state.startOpacity) * eased;
        state.card.widget.set_opacity(
          visualOpacity(state.currentOffset) * state.currentOpacity * entrance,
        );
      }
      applyCardVisuals();

      if (moveProgress >= 1 && entrance >= 1) {
        tickId = 0;
        finishAnimation();
        return GLib.SOURCE_REMOVE;
      }
      return GLib.SOURCE_CONTINUE;
    });
  }

  function reconcileCards(direction = 0) {
    // A new key press can arrive before the previous transition completes.
    // Drop cards that were already leaving instead of letting their transformed
    // bounds accumulate across repeated input.
    for (const [path, state] of [...cards]) {
      if (!state.retained) removeCard(path, state);
    }

    for (const state of cards.values()) {
      state.retained = false;
      state.startOffset = state.currentOffset;
      state.startOpacity = state.currentOpacity;
      state.targetOpacity = 0;
      state.targetOffset = state.currentOffset - (direction || Math.sign(state.currentOffset) || 1);
    }

    const visibleItems: Wallpaper[] = [];
    for (let offset = -PREFETCH_RADIUS; offset <= PREFETCH_RADIUS; offset++) {
      const wallpaper = filtered[selectedIndex + offset];
      if (!wallpaper) continue;
      visibleItems.push(wallpaper);

      let state = cards.get(wallpaper.path);
      if (!state) {
        const card = createWallpaperCard(handleCardClicked);
        card.bind(wallpaper);
        fixed.put(card.widget, 0, 0);
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
        cards.set(wallpaper.path, state);
      } else {
        state.retained = true;
        state.targetOffset = offset;
        state.targetOpacity = 1;
      }
    }

    ensureWallpaperThumbnails(visibleItems, true);
    updateLabels();
    startAnimation();
  }

  function setSelection(index: number) {
    if (filtered.length === 0) {
      selectedIndex = 0;
      reconcileCards();
      return;
    }
    const next = Math.max(0, Math.min(filtered.length - 1, index));
    if (next === selectedIndex && cards.size > 0) return;
    const direction = Math.sign(next - selectedIndex);
    selectedIndex = next;
    reconcileCards(direction);
  }

  function filterWallpapers() {
    const previousPath = selectedWallpaper()?.path;
    filtered = wallpapers.get();
    const preservedIndex = previousPath
      ? filtered.findIndex((wallpaper) => wallpaper.path === previousPath)
      : -1;
    selectedIndex = preservedIndex >= 0 ? preservedIndex : 0;
    reconcileCards();
  }

  const scrollController = new Gtk.EventControllerScroll({
    flags: Gtk.EventControllerScrollFlags.VERTICAL | Gtk.EventControllerScrollFlags.DISCRETE,
  });
  scrollController.connect('scroll', (_controller, _dx, dy) => {
    if (dy !== 0) moveSelection(dy > 0 ? 1 : -1);
    return true;
  });
  fixed.add_controller(scrollController);

  const unsubscribeWallpapers = wallpapers.subscribe(() => {
    if (active) filterWallpapers();
  });
  const unsubscribeError = wallpaperError.subscribe(updateLabels);
  const unsubscribeLoading = wallpapersLoading.subscribe(updateLabels);
  const unsubscribeThumbnail = subscribeThumbnailReady((path) => {
    cards.get(path)?.card.refreshImage();
  });

  const content = (
    <box
      class="wallpaper-selector-content"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={8}
      hexpand
      halign={Gtk.Align.FILL}
    >
      {coverFlowLayer}
      {statusLabel}
    </box>
  ) as Gtk.Box;

  content.connect('destroy', () => {
    if (tickId !== 0) fixed.remove_tick_callback(tickId);
    unsubscribeWallpapers();
    unsubscribeError();
    unsubscribeLoading();
    unsubscribeThumbnail();
    for (const [path, state] of cards) removeCard(path, state);
  });

  const controller: CoverFlowController = {
    widget: content,
    setActive(value) {
      active = value;
      if (value) {
        lastMoveAt = 0;
        entrance = 0;
        entranceStart = GLib.get_monotonic_time();
        filterWallpapers();
        startAnimation();
      } else {
        if (tickId !== 0) {
          fixed.remove_tick_callback(tickId);
          tickId = 0;
        }
        for (const state of cards.values()) state.card.clear();
        for (const [path, state] of cards) removeCard(path, state);
      }
    },
    moveSelection,
    activateSelection,
  };

  return controller;
}
