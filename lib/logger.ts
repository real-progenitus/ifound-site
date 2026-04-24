/**
 * Tiny structured logger for both server and client code.
 *
 * Goals:
 *   • Emit single-line JSON so Vercel / any log drain can index records.
 *   • Never dump raw Firestore / third-party error objects — they can carry
 *     request payloads, document paths, and query values that are effectively
 *     PII. We only surface `name`, `message`, optional `code`, and the stack
 *     trace in non-production environments.
 *   • `debug` is a no-op in production so verbose request tracing does not
 *     leak into server logs or user browsers.
 *
 * Usage:
 *   const log = createLogger('map-posts');
 *   log.info('fetched', { count: 42 });
 *   log.error('firestore query failed', err);
 */
const isProd = process.env.NODE_ENV === 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type Meta = Record<string, unknown>;

interface ScrubbedError {
  name: string;
  message: string;
  code?: string;
  stack?: string;
}

function scrubError(err: unknown): ScrubbedError | { value: string } {
  if (err instanceof Error) {
    const out: ScrubbedError = { name: err.name, message: err.message };
    const maybeCode = (err as { code?: unknown }).code;
    if (typeof maybeCode === 'string' || typeof maybeCode === 'number') {
      out.code = String(maybeCode);
    }
    if (!isProd && typeof err.stack === 'string') {
      out.stack = err.stack;
    }
    return out;
  }
  // Anything we don't recognise is coerced to a string so we never serialise
  // an arbitrary object that might contain PII.
  try {
    return { value: String(err) };
  } catch {
    return { value: '[unserialisable]' };
  }
}

function emit(level: LogLevel, scope: string, message: string, meta?: Meta) {
  const record: Record<string, unknown> = {
    level,
    scope,
    message,
    ts: new Date().toISOString(),
  };
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      if (v !== undefined) record[k] = v;
    }
  }

  let line: string;
  try {
    line = JSON.stringify(record);
  } catch {
    line = JSON.stringify({ level, scope, message, ts: record.ts, note: 'meta-unserialisable' });
  }

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export interface Logger {
  debug(message: string, meta?: Meta): void;
  info(message: string, meta?: Meta): void;
  warn(message: string, meta?: Meta): void;
  error(message: string, err?: unknown, meta?: Meta): void;
}

export function createLogger(scope: string): Logger {
  return {
    debug(message, meta) {
      if (isProd) return;
      emit('debug', scope, message, meta);
    },
    info(message, meta) {
      emit('info', scope, message, meta);
    },
    warn(message, meta) {
      emit('warn', scope, message, meta);
    },
    error(message, err, meta) {
      const errorPart = err !== undefined ? { error: scrubError(err) } : undefined;
      emit('error', scope, message, { ...errorPart, ...meta });
    },
  };
}
