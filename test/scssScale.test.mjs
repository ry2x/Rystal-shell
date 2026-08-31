import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {describe, it} from 'node:test';
import {URL} from 'node:url';

const scssDirectory = new URL('../styles/scss/', import.meta.url);
const styleEntry = new URL('../styles/style.scss', import.meta.url);
const defaultStyleDirectory = new URL('../styles/default/', import.meta.url);
const rawPixelPattern = /(?<![\w.-])-?(?:\d+(?:\.\d+)?|\.\d+)px\b/;

describe('SCSS UI scale coverage', () => {
  it('uses s() for every pixel dimension in style partials', () => {
    const unscaledFiles = fs
      .readdirSync(scssDirectory)
      .filter(name => name.endsWith('.scss') && name !== '_variables.scss')
      .filter(name => rawPixelPattern.test(fs.readFileSync(new URL(name, scssDirectory), 'utf8')))
      .map(name => path.join('styles/scss', name));

    assert.deepEqual(unscaledFiles, []);
  });

  it('compiles all supported scales into isolated window classes', () => {
    const result = spawnSync(
      'sass',
      [
        '--style=expanded',
        '--no-source-map',
        '--load-path',
        defaultStyleDirectory.pathname,
        styleEntry.pathname,
      ],
      {encoding: 'utf8'}
    );

    assert.equal(result.status, 0, result.stderr);
    for (const [className, scale] of [
      ['ui-scale-075', 0.75],
      ['ui-scale-100', 1],
      ['ui-scale-125', 1.25],
      ['ui-scale-150', 1.5],
      ['ui-scale-200', 2],
    ]) {
      assert.match(
        result.stdout,
        new RegExp(`window\\.${className} \\{[^}]*font-size: ${scale}em`, 's')
      );
      assert.match(result.stdout, new RegExp(`window\\.${className}\\.Bar \\{`));
    }

    assert.match(
      result.stdout,
      /window\.ui-scale-075 \.empty-state \{[^}]*border-radius: 10\.5px/s
    );
    assert.match(result.stdout, /window\.ui-scale-200 \.empty-state \{[^}]*border-radius: 28px/s);
    assert.match(result.stdout, /window\.ui-scale-125\.NotificationPopups \.notif-card \{/);
  });
});
