/**
 * Sistema de logging estruturado para rastreamento de erros e eventos
 * Facilita debugging em produção e análise de comportamento do usuário
 */

// Níveis de log
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Categorias de eventos
export const LogCategory = {
  ANALISE: 'analise',
  DOCUMENTO: 'documento',
  CASO: 'caso',
  USUARIO: 'usuario',
  API: 'api',
  VALIDACAO: 'validacao',
  PERFORMANCE: 'performance'
};

class Logger {
  constructor() {
    this.enabled = true;
    this.minLevel = LogLevel.INFO;
    this.listeners = [];
    this.sessionId = this.generateSessionId();
  }

  /**
   * Gera ID único para a sessão
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Adiciona listener para eventos de log
   * @param {Function} listener - Função callback para eventos de log
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Remove listener
   * @param {Function} listener - Função callback a ser removida
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Notifica listeners sobre novo evento de log
   * @param {object} logEntry - Entrada de log
   */
  notifyListeners(logEntry) {
    this.listeners.forEach(listener => {
      try {
        listener(logEntry);
      } catch (erro) {
        console.error('Erro ao notificar listener de log:', erro);
      }
    });
  }

  /**
   * Cria entrada de log estruturada
   * @param {string} level - Nível do log
   * @param {string} category - Categoria do evento
   * @param {string} message - Mensagem do log
   * @param {object} metadata - Metadados adicionais
   * @returns {object} Entrada de log estruturada
   */
  createLogEntry(level, category, message, metadata = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      ...metadata
    };
  }

  /**
   * Envia log para console e listeners
   * @param {object} logEntry - Entrada de log
   */
  sendLog(logEntry) {
    if (!this.enabled) return;

    // Envia para console
    const consoleMethod = logEntry.level === LogLevel.ERROR || logEntry.level === LogLevel.CRITICAL
      ? 'error'
      : logEntry.level === LogLevel.WARN
      ? 'warn'
      : 'log';

    console[consoleMethod](`[${logEntry.level.toUpperCase()}] [${logEntry.category}]`, logEntry.message, logEntry);

    // Notifica listeners (ex: envio para Sentry, LogRocket, etc.)
    this.notifyListeners(logEntry);

    // Em produção, pode enviar para API de logging
    if (process.env.NODE_ENV === 'production' && logEntry.level !== LogLevel.DEBUG) {
      this.sendToRemote(logEntry);
    }
  }

  /**
   * Envia log para servidor remoto
   * @param {object} logEntry - Entrada de log
   */
  async sendToRemote(logEntry) {
    try {
      // Implementar envio para API de logging
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logEntry)
      // });
    } catch (erro) {
      console.error('Erro ao enviar log para servidor:', erro);
    }
  }

  /**
   * Log de debug
   * @param {string} category - Categoria do evento
   * @param {string} message - Mensagem
   * @param {object} metadata - Metadados
   */
  debug(category, message, metadata = {}) {
    const logEntry = this.createLogEntry(LogLevel.DEBUG, category, message, metadata);
    this.sendLog(logEntry);
  }

  /**
   * Log de informação
   * @param {string} category - Categoria do evento
   * @param {string} message - Mensagem
   * @param {object} metadata - Metadados
   */
  info(category, message, metadata = {}) {
    const logEntry = this.createLogEntry(LogLevel.INFO, category, message, metadata);
    this.sendLog(logEntry);
  }

  /**
   * Log de aviso
   * @param {string} category - Categoria do evento
   * @param {string} message - Mensagem
   * @param {object} metadata - Metadados
   */
  warn(category, message, metadata = {}) {
    const logEntry = this.createLogEntry(LogLevel.WARN, category, message, metadata);
    this.sendLog(logEntry);
  }

  /**
   * Log de erro
   * @param {string} category - Categoria do evento
   * @param {string} message - Mensagem
   * @param {Error|object} error - Objeto de erro
   * @param {object} metadata - Metadados adicionais
   */
  error(category, message, error = null, metadata = {}) {
    const errorMetadata = error ? {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      ...metadata
    } : metadata;

    const logEntry = this.createLogEntry(LogLevel.ERROR, category, message, errorMetadata);
    this.sendLog(logEntry);
  }

  /**
   * Log de erro crítico
   * @param {string} category - Categoria do evento
   * @param {string} message - Mensagem
   * @param {Error|object} error - Objeto de erro
   * @param {object} metadata - Metadados adicionais
   */
  critical(category, message, error = null, metadata = {}) {
    const errorMetadata = error ? {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      ...metadata
    } : metadata;

    const logEntry = this.createLogEntry(LogLevel.CRITICAL, category, message, errorMetadata);
    this.sendLog(logEntry);
  }

  /**
   * Log de evento de análise
   * @param {string} eventType - Tipo do evento
   * @param {object} data - Dados do evento
   */
  logAnalise(eventType, data = {}) {
    this.info(LogCategory.ANALISE, `Análise: ${eventType}`, {
      eventType,
      ...data
    });
  }

  /**
   * Log de evento de documento
   * @param {string} eventType - Tipo do evento
   * @param {object} data - Dados do evento
   */
  logDocumento(eventType, data = {}) {
    this.info(LogCategory.DOCUMENTO, `Documento: ${eventType}`, {
      eventType,
      ...data
    });
  }

  /**
   * Log de evento de caso
   * @param {string} eventType - Tipo do evento
   * @param {object} data - Dados do evento
   */
  logCaso(eventType, data = {}) {
    this.info(LogCategory.CASO, `Caso: ${eventType}`, {
      eventType,
      ...data
    });
  }

  /**
   * Log de performance
   * @param {string} operation - Nome da operação
   * @param {number} duration - Duração em ms
   * @param {object} metadata - Metadados adicionais
   */
  logPerformance(operation, duration, metadata = {}) {
    const level = duration > 3000 ? LogLevel.WARN : LogLevel.INFO;
    const logEntry = this.createLogEntry(level, LogCategory.PERFORMANCE, `Performance: ${operation}`, {
      operation,
      duration,
      durationFormatted: `${duration}ms`,
      ...metadata
    });
    this.sendLog(logEntry);
  }
}

// Instância singleton do logger
const logger = new Logger();

// Exporta instância e classes
export default logger;
export { Logger };

// Funções de conveniência para uso direto
export const logDebug = (category, message, metadata) => logger.debug(category, message, metadata);
export const logInfo = (category, message, metadata) => logger.info(category, message, metadata);
export const logWarn = (category, message, metadata) => logger.warn(category, message, metadata);
export const logError = (category, message, error, metadata) => logger.error(category, message, error, metadata);
export const logCritical = (category, message, error, metadata) => logger.critical(category, message, error, metadata);
export const logAnalise = (eventType, data) => logger.logAnalise(eventType, data);
export const logDocumento = (eventType, data) => logger.logDocumento(eventType, data);
export const logCaso = (eventType, data) => logger.logCaso(eventType, data);
export const logPerformance = (operation, duration, metadata) => logger.logPerformance(operation, duration, metadata);

/**
 * HOC para medir performance de funções
 * @param {Function} fn - Função a ser medida
 * @param {string} operationName - Nome da operação
 * @returns {Function} Função com medição de performance
 */
export const withPerformanceLog = (fn, operationName) => {
  return async (...args) => {
    const startTime = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;
      logPerformance(operationName, duration, { success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      logPerformance(operationName, duration, { success: false, error: error.message });
      throw error;
    }
  };
};
