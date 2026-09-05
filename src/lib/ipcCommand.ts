interface IpcCommandBase {
  name: string;
  aliases?: readonly string[];
  description: string;
}

interface IpcLeafCommand extends IpcCommandBase {
  usage?: string;
  minArgs?: number;
  maxArgs?: number;
  execute: (args: readonly string[]) => string | Promise<string>;
  subcommands?: never;
  defaultSubcommand?: never;
}

interface IpcCommandGroup extends IpcCommandBase {
  subcommands: readonly IpcCommand[];
  defaultSubcommand: string;
  execute?: never;
  usage?: never;
  minArgs?: never;
  maxArgs?: never;
}

export type IpcCommand = IpcLeafCommand | IpcCommandGroup;

export class IpcUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IpcUsageError';
  }
}

const HELP_TOKENS = new Set(['help', '--help', '-h']);

function isHelpToken(value: string | undefined) {
  return value !== undefined && HELP_TOKENS.has(value);
}

function tokenizeRequest(request: readonly string[]) {
  return request.flatMap(argument => argument.trim().split(/\s+/).filter(Boolean));
}

function findCommand(commands: readonly IpcCommand[], name: string) {
  return commands.find(command => command.name === name || command.aliases?.includes(name));
}

function isCommandGroup(command: IpcCommand): command is IpcCommandGroup {
  return Array.isArray(command.subcommands);
}

function formatCommandName(command: IpcCommand) {
  if (!command.aliases?.length) return command.name;
  return `${command.name} (${command.aliases.join(', ')})`;
}

function formatCommandList(commands: readonly IpcCommand[], defaultSubcommand?: string) {
  const names = commands.map(formatCommandName);
  const width = Math.max(...names.map(name => name.length));

  return commands.map((command, index) => {
    const defaultLabel = command.name === defaultSubcommand ? ' [default]' : '';
    return `  ${names[index].padEnd(width)}  ${command.description}${defaultLabel}`;
  });
}

function formatInvocation(instanceName: string, command: string) {
  return `ags request -i ${instanceName} "${command}"`;
}

function formatCommandHelp(
  command: IpcCommand,
  parentNames: readonly string[],
  instanceName: string
) {
  const commandNames = [...parentNames, command.name];

  if (isCommandGroup(command)) {
    return [
      `Usage: ${formatInvocation(instanceName, `${commandNames.join(' ')} [command]`)}`,
      '',
      command.description,
      '',
      'Commands:',
      ...formatCommandList(command.subcommands, command.defaultSubcommand),
    ].join('\n');
  }

  const usage = [...commandNames, command.usage].filter(Boolean).join(' ');
  const lines = [`Usage: ${formatInvocation(instanceName, usage)}`, '', command.description];
  if (command.aliases?.length) lines.push('', `Aliases: ${command.aliases.join(', ')}`);
  return lines.join('\n');
}

function formatRootHelp(commands: readonly IpcCommand[], instanceName: string) {
  return [
    `Usage: ${formatInvocation(instanceName, '<command> [arguments]')}`,
    '',
    'Commands:',
    ...formatCommandList(commands),
    '',
    `Run \`${formatInvocation(instanceName, 'help <command>')}\` for command details.`,
  ].join('\n');
}

function resolveHelp(
  commands: readonly IpcCommand[],
  names: readonly string[],
  parentNames: readonly string[],
  fallbackHelp: string,
  instanceName: string
): string {
  if (names.length === 0) return fallbackHelp;

  const [name, ...remaining] = names;
  const command = findCommand(commands, name);
  if (!command) {
    const scope = parentNames.length > 0 ? ` for "${parentNames.join(' ')}"` : '';
    return `Error: Unknown command "${name}"${scope}.\n\n${fallbackHelp}`;
  }

  const commandHelp = formatCommandHelp(command, parentNames, instanceName);
  if (remaining.length === 0 || !isCommandGroup(command)) {
    return commandHelp;
  }

  return resolveHelp(
    command.subcommands,
    remaining,
    [...parentNames, command.name],
    commandHelp,
    instanceName
  );
}

function validateArgumentCount(command: IpcLeafCommand, args: readonly string[]) {
  const minArgs = command.minArgs ?? 0;
  const maxArgs = command.maxArgs ?? 0;
  if (args.length >= minArgs && args.length <= maxArgs) return;

  if (minArgs === maxArgs) {
    throw new IpcUsageError(`Expected ${minArgs} argument${minArgs === 1 ? '' : 's'}.`);
  }
  throw new IpcUsageError(`Expected between ${minArgs} and ${maxArgs} arguments.`);
}

async function executeCommand(
  command: IpcCommand,
  args: readonly string[],
  parentNames: readonly string[],
  instanceName: string
): Promise<string> {
  if (isHelpToken(args[0])) return formatCommandHelp(command, parentNames, instanceName);

  if (isCommandGroup(command)) {
    const [subcommandName, ...remaining] = args;
    const subcommand = subcommandName
      ? findCommand(command.subcommands, subcommandName)
      : findCommand(command.subcommands, command.defaultSubcommand);

    if (!subcommand) {
      return `Error: Unknown command "${subcommandName}" for "${[...parentNames, command.name].join(
        ' '
      )}".\n\n${formatCommandHelp(command, parentNames, instanceName)}`;
    }

    return executeCommand(
      subcommand,
      subcommandName ? remaining : [],
      [...parentNames, command.name],
      instanceName
    );
  }

  try {
    validateArgumentCount(command, args);
    return await command.execute(args);
  } catch (error) {
    if (error instanceof IpcUsageError) {
      return `Error: ${error.message}\n\n${formatCommandHelp(command, parentNames, instanceName)}`;
    }
    const message = error instanceof Error ? error.message : String(error);
    return `Error: ${message}`;
  }
}

export async function executeIpcRequest(
  commands: readonly IpcCommand[],
  request: readonly string[],
  instanceName: string
): Promise<string> {
  const [commandName, ...args] = tokenizeRequest(request);
  if (!commandName) return formatRootHelp(commands, instanceName);
  if (isHelpToken(commandName)) {
    return resolveHelp(commands, args, [], formatRootHelp(commands, instanceName), instanceName);
  }

  const command = findCommand(commands, commandName);
  if (!command) {
    return `Error: Unknown command "${commandName}".\n\n${formatRootHelp(commands, instanceName)}`;
  }

  return executeCommand(command, args, [], instanceName);
}
