import {Gtk} from 'ags/gtk4';

import GLib from 'gi://GLib';

import {easeOutCubic, getCoverFlowOpacity} from '../coverFlowGeometry';
import {WallpaperCardController} from './WallpaperCard';

export interface CoverFlowCardState {
  card: WallpaperCardController;
  currentOffset: number;
  startOffset: number;
  targetOffset: number;
  currentOpacity: number;
  startOpacity: number;
  targetOpacity: number;
  retained: boolean;
}

interface CoverFlowAnimationOptions {
  fixed: Gtk.Fixed;
  cards: Map<string, CoverFlowCardState>;
  onVisualsUpdated: () => void;
  onFinished: () => void;
}

const MOVE_DURATION_US = 320_000;
const ENTRANCE_DURATION_US = 420_000;

export class CoverFlowAnimation {
  private tickId = 0;
  private animationStartedAt = 0;
  private entrance = 0;
  private entranceStart = 0;

  constructor(private readonly options: CoverFlowAnimationOptions) {}

  getEntrance() {
    return this.entrance;
  }

  resetEntrance() {
    this.entrance = 0;
    this.entranceStart = GLib.get_monotonic_time();
  }

  start() {
    this.animationStartedAt = GLib.get_monotonic_time();
    if (this.tickId !== 0) return;

    this.tickId = this.options.fixed.add_tick_callback((_widget, frameClock) => {
      const now = frameClock.get_frame_time();
      const moveProgress = Math.min(1, (now - this.animationStartedAt) / MOVE_DURATION_US);
      const eased = easeOutCubic(moveProgress);
      if (this.entrance < 1) {
        this.entrance = easeOutCubic(
          Math.min(1, (now - this.entranceStart) / ENTRANCE_DURATION_US)
        );
      }

      for (const state of this.options.cards.values()) {
        state.currentOffset = state.startOffset + (state.targetOffset - state.startOffset) * eased;
        state.currentOpacity =
          state.startOpacity + (state.targetOpacity - state.startOpacity) * eased;
        state.card.widget.set_opacity(
          getCoverFlowOpacity(state.currentOffset) * state.currentOpacity * this.entrance
        );
      }
      this.options.onVisualsUpdated();

      if (moveProgress < 1 || this.entrance < 1) return GLib.SOURCE_CONTINUE;
      this.tickId = 0;
      this.options.onFinished();
      return GLib.SOURCE_REMOVE;
    });
  }

  stop() {
    if (this.tickId === 0) return;
    this.options.fixed.remove_tick_callback(this.tickId);
    this.tickId = 0;
  }
}
