import Graphene from 'gi://Graphene';
import Gsk from 'gi://Gsk';

import {type UiScaleContext} from '@/lib/uiScale';

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

export function createCoverFlowTransform(
  offset: number,
  containerWidth: number,
  entrance: number,
  uiScale: UiScaleContext
) {
  const distance = Math.abs(offset);
  const direction = Math.sign(offset);
  const horizontal =
    distance <= 1
      ? distance * uiScale.value(290)
      : uiScale.value(290) + (distance - 1) * uiScale.value(190);
  const scale = interpolateStops(distance, [1.06, 0.88, 0.76, 0.64, 0.56]);
  const skew = direction * interpolateStops(distance, [0, -9, -12, -14, -16]);
  const cardWidth = uiScale.size(384);
  const cardHeight = uiScale.size(252);
  const arcDrop = interpolateStops(distance, [-14, 24, 62, 108, 152].map(uiScale.value));
  const x = (containerWidth - cardWidth) / 2 + direction * horizontal;
  const y = uiScale.value(52) + arcDrop + (1 - entrance) * uiScale.value(70);

  let transform: Gsk.Transform | null = Gsk.Transform.new();
  transform = transform.translate(new Graphene.Point({x, y}));
  transform = transform!.translate(
    new Graphene.Point({
      x: cardWidth / 2,
      y: cardHeight / 2,
    })
  );
  transform = transform!.skew(skew, 0);
  transform = transform!.scale(scale, scale);
  transform = transform!.translate(
    new Graphene.Point({
      x: -cardWidth / 2,
      y: -cardHeight / 2,
    })
  );
  return transform;
}
