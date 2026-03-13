/**
 * Sistema padronizado de logs e tratamento de erros
 * Garante consistência na forma como erros e eventos são logados
 */

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

const isDev = import.meta.env.MODE === 'development';

/**
 * Função centralizada de logging com contexto padronizado
 */
export const logEvent = (level, message, context = {}, error = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    context,
    userAgent: navigator.userAgent.substring(0, 100),
    url: window.location.pathname
  };

  if (error) {
    logEntry.errorStack = error.stack || error.toString();
    logEntry.errorMessage = error.message || error.toString();
  }

  // Log no console apenas em desenvolvimento
  if (isDev) {
    const styleMap = {
      [LOG_LEVELS.ERROR]: 'color: #ef4444; font-weight: bold;',
      [LOG_LEVELS.WARN]: 'color: #f59e0b; font-weight: bold;',
      [LOG_LEVELS.INFO]: 'color: #3b82f6; font-weight: bold;',
      [LOG_LEVELS.DEBUG]: 'color: #6b7280;'
    };
    console.log(`%c[${logEntry.level.toUpperCase()}] ${message}`, styleMap[level], context);
  }

  return logEntry;
};

export const logError = (message, error, context = {}) => 
  logEvent(LOG_LEVELS.ERROR, message, context, error);

export const logWarn = (message, context = {}) => 
  logEvent(LOG_LEVELS.WARN, message, context);

export const logInfo = (message, context = {}) => 
  logEvent(LOG_LEVELS.INFO, message, context);

export const logDebug = (message, context = {}) => 
  logEvent(LOG_LEVELS.DEBUG, message, context);