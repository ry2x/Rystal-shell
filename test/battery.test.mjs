import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {getBatteryIcon, getBatteryTooltip, parseBatteryProperties} from '../src/lib/battery.ts';

const properties = {Type: 2, IsPresent: true, Percentage: 56.7, State: 2};

describe('battery display data', () => {
  it('accepts real empty and full batteries without capping 100%', () => {
    for (const percentage of [0, 56.7, 100]) {
      assert.deepEqual(parseBatteryProperties({...properties, Percentage: percentage}), {
        percentage,
        state: 2,
      });
    }
  });

  it('hides absent devices, UPS devices, and unavailable or invalid readings', () => {
    for (const value of [
      null,
      {},
      {...properties, IsPresent: false},
      {...properties, Type: 3},
      {...properties, Percentage: undefined},
      {...properties, Percentage: '50'},
      {...properties, Percentage: NaN},
      {...properties, Percentage: Infinity},
      {...properties, Percentage: -1},
      {...properties, Percentage: 101},
    ]) {
      assert.equal(parseBatteryProperties(value), null);
    }
  });

  it('reflects charging, discharging, fully charged, and pending states', () => {
    const charging = {percentage: 57, state: 1};
    const discharging = {percentage: 57, state: 2};
    const full = {percentage: 100, state: 4};
    assert.equal(getBatteryIcon(charging), 'battery-charging');
    assert.equal(getBatteryIcon(discharging), 'battery-medium');
    assert.equal(getBatteryIcon(full), 'battery-full');
    assert.match(getBatteryTooltip(charging), /57% · Charging/);
    assert.match(getBatteryTooltip(discharging), /57% · Discharging/);
    assert.match(getBatteryTooltip(full), /100% · Fully charged/);
    assert.match(getBatteryTooltip({percentage: 80, state: 5}), /Pending charge/);
    assert.match(getBatteryTooltip({percentage: 80, state: 6}), /Pending discharge/);
  });

  it('shows unknown state without inventing a charging status', () => {
    const battery = parseBatteryProperties({...properties, State: undefined});
    assert.deepEqual(battery, {percentage: 56.7, state: 0});
    assert.match(getBatteryTooltip(battery), /Unknown/);
  });
});
