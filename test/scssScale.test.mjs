import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
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

  it('compiles every supported scale', () => {
    for (const scale of [0.75, 1, 1.25, 1.5, 2]) {
      const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rystal-scale-test-'));
      try {
        fs.writeFileSync(
          path.join(temporaryDirectory, '_current-scale.scss'),
          `$app-scale: ${scale};\n`
        );
        const result = spawnSync(
          'sass',
          [
            '--style=expanded',
            '--no-source-map',
            '--load-path',
            temporaryDirectory,
            '--load-path',
            defaultStyleDirectory.pathname,
            styleEntry.pathname,
          ],
          {encoding: 'utf8'}
        );

        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, new RegExp(`font-size: ${scale}em`));
        assert.match(result.stdout, new RegExp(`border-radius: ${8 * scale}px`));
        assert.ok(result.stdout.includes(`min-width: ${Math.round(50 * scale)}px`));
      } finally {
        fs.rmSync(temporaryDirectory, {recursive: true, force: true});
      }
    }
  });
});
