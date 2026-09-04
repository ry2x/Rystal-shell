import Graphene from 'gi://Graphene';
import Gsk from 'gi://Gsk';

import {shellGeometry} from '@/lib/shellGeometry';
import {scaleUi} from '@/lib/uiScale';

function interpolateStops(distance: number, values: readonly number[]) {
  const clamped = Math.min(distance, values.length - 1);
  const lower = Math.floor(clamped);
  const upper = Math.min(values.length - 1, lower + 1);
  return values[lower] + (values[upper] - values[lower]) * (clamped - lower);
}

export function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

export function getCoverFlowOpacity(offset: number) {
  return interpolateStops(Math.abs(offset), [1, 1, 1, 0.85, 0]);
}

export function createCoverFlowTransform(offset: number, containerWidth: number, entrance: number) {
  const distance = Math.abs(offset);
  const direction = Math.sign(offset);
  const horizontal =
    distance <= 1 ? distance * scaleUi(290) : scaleUi(290) + (distance - 1) * scaleUi(190);
  const scale = interpolateStops(distance, [1.06, 0.88, 0.76, 0.64, 0.56]);
  const skew = direction * interpolateStops(distance, [0, -9, -12, -14, -16]);
  const arcDrop = interpolateStops(distance, [-14, 24, 62, 108, 152].map(scaleUi));
  const x = (containerWidth - shellGeometry.wallpaperCardWidth) / 2 + direction * horizontal;
  const y = scaleUi(52) + arcDrop + (1 - entrance) * scaleUi(70);

  let transform: Gsk.Transform | null = Gsk.Transform.new();
  transform = transform.translate(new Graphene.Point({x, y}));
  transform = transform!.translate(
    new Graphene.Point({
      x: shellGeometry.wallpaperCardWidth / 2,
      y: shellGeometry.wallpaperCardHeight / 2,
    })
  );
  transform = transform!.skew(skew, 0);
  transform = transform!.scale(scale, scale);
  transform = transform!.translate(
    new Graphene.Point({
      x: -shellGeometry.wallpaperCardWidth / 2,
      y: -shellGeometry.wallpaperCardHeight / 2,
    })
  );
  return transform;
}
