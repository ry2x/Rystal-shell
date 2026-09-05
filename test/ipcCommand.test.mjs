import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {IpcUsageError, executeIpcRequest as executeRequest} from '../src/lib/ipcCommand.ts';

const INSTANCE_NAME = 'test-shell';

function executeIpcRequest(commands, request) {
  return executeRequest(commands, request, INSTANCE_NAME);
}

function createCommands() {
  return [
    {
      name: 'status',
      description: 'Show status.',
      execute: () => 'ready',
    },
    {
      name: 'group',
      description: 'Manage values.',
      defaultSubcommand: 'get',
      subcommands: [
        {
          name: 'get',
          description: 'Get the value.',
          execute: () => 'current',
        },
        {
          name: 'set',
          aliases: ['s'],
          description: 'Set the value.',
          usage: '<value>',
          minArgs: 1,
          maxArgs: 1,
          execute: ([value]) => `set:${value}`,
        },
      ],
    },
  ];
}

describe('executeIpcRequest', () => {
  it('generates root help for empty and help requests', async () => {
    const commands = createCommands();
    const emptyHelp = await executeIpcRequest(commands, []);
    const explicitHelp = await Promise.all(
      ['help', '--help', '-h'].map(helpToken => executeIpcRequest(commands, [helpToken]))
    );

    assert.deepEqual(explicitHelp, [emptyHelp, emptyHelp, emptyHelp]);
    assert.match(emptyHelp, /Usage: ags request -i test-shell "<command> \[arguments\]"/);
    assert.match(emptyHelp, /status\s+Show status\./);
    assert.match(emptyHelp, /group\s+Manage values\./);
  });

  it('generates group and leaf help from command definitions', async () => {
    const commands = createCommands();
    const groupHelp = await executeIpcRequest(commands, ['help', 'group']);
    const inlineHelp = await executeIpcRequest(commands, ['group', 'help']);
    const flagHelp = await executeIpcRequest(commands, ['group', '--help']);
    const leafHelp = await executeIpcRequest(commands, ['help', 'group', 'set']);

    assert.equal(inlineHelp, groupHelp);
    assert.equal(flagHelp, groupHelp);
    assert.match(groupHelp, /get\s+Get the value\. \[default\]/);
    assert.match(groupHelp, /set \(s\)\s+Set the value\./);
    assert.match(leafHelp, /Usage: ags request -i test-shell "group set <value>"/);
    assert.match(leafHelp, /Aliases: s/);
  });

  it('resolves default subcommands and aliases', async () => {
    const commands = createCommands();

    assert.equal(await executeIpcRequest(commands, ['group']), 'current');
    assert.equal(await executeIpcRequest(commands, ['group', 's', 'next']), 'set:next');
  });

  it('accepts quoted command lines and separate arguments', async () => {
    const commands = createCommands();

    assert.equal(await executeIpcRequest(commands, ['group set next']), 'set:next');
    assert.equal(await executeIpcRequest(commands, ['group', 'set', 'next']), 'set:next');
  });

  it('returns scoped help for unknown commands', async () => {
    const commands = createCommands();
    const unknownRoot = await executeIpcRequest(commands, ['missing']);
    const unknownChild = await executeIpcRequest(commands, ['group', 'missing']);

    assert.match(unknownRoot, /^Error: Unknown command "missing"\./);
    assert.match(unknownRoot, /Commands:\n\s+status/);
    assert.match(unknownChild, /^Error: Unknown command "missing" for "group"\./);
    assert.match(unknownChild, /Usage: ags request -i test-shell "group \[command\]"/);
  });

  it('adds leaf help to argument and value validation errors', async () => {
    const commands = createCommands();
    const missingArgument = await executeIpcRequest(commands, ['group', 'set']);
    const invalidValue = await executeIpcRequest(
      [
        {
          name: 'validate',
          description: 'Validate a value.',
          usage: '<value>',
          minArgs: 1,
          maxArgs: 1,
          execute() {
            throw new IpcUsageError('Invalid value.');
          },
        },
      ],
      ['validate', 'bad']
    );

    assert.match(missingArgument, /^Error: Expected 1 argument\./);
    assert.match(missingArgument, /Usage: ags request -i test-shell "group set <value>"/);
    assert.match(invalidValue, /^Error: Invalid value\./);
    assert.match(invalidValue, /Usage: ags request -i test-shell "validate <value>"/);
  });

  it('normalizes asynchronous results and runtime errors', async () => {
    const asyncResult = await executeIpcRequest(
      [{name: 'async', description: 'Run async work.', execute: async () => 'done'}],
      ['async']
    );
    const failure = await executeIpcRequest(
      [
        {
          name: 'fail',
          description: 'Fail.',
          execute() {
            throw new Error('failed');
          },
        },
      ],
      ['fail']
    );

    assert.equal(asyncResult, 'done');
    assert.equal(failure, 'Error: failed');
  });
});
