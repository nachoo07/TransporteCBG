const levelToConsole = {
  info: 'log',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
};

function log(level, ...args) {
  const ts = new Date().toISOString();
  const consoleMethod = levelToConsole[level] ?? 'log';
  const prefix = `[${ts}] ${String(level).toUpperCase()}:`;

  if (args.length === 0) {
    // eslint-disable-next-line no-console
    console[consoleMethod](prefix);
    return;
  }

  // Firma estilo pino: logger.warn(obj, 'mensaje')
  if (
    args.length >= 2 &&
    args[0] &&
    typeof args[0] === 'object' &&
    typeof args[1] === 'string'
  ) {
    // eslint-disable-next-line no-console
    console[consoleMethod](prefix, args[1], args[0]);
    return;
  }

  // Firma: logger.info('mensaje') o logger.error(obj)
  // eslint-disable-next-line no-console
  console[consoleMethod](prefix, ...args);
}

const logger = {
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args),
  debug: (...args) => log('debug', ...args),
};

export default logger;

