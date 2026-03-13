/**
 * Sistema de cache em memória para dados de acesso frequente
 * Reduz requisições ao banco de dados para dados que não mudam frequentemente
 */

class QueryCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  /**
   * Define tempo de expiração padrão para diferentes tipos de dados (em ms)
   */
  getTTL(type) {
    const ttlMap = {
      cliente: 5 * 60 * 1000,        // 5 minutos
      clientes: 5 * 60 * 1000,       // 5 minutos
      hipotese: 30 * 60 * 1000,      // 30 minutos
      labels: 60 * 60 * 1000,        // 1 hora
      config: 60 * 60 * 1000,        // 1 hora
    };
    return ttlMap[type] || 10 * 60 * 1000; // 10 minutos padrão
  }

  /**
   * Recupera valor do cache se ainda estiver válido
   */
  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp) return null;

    const ttl = this.getTTL(key.split(':')[0]);
    const isExpired = Date.now() - timestamp > ttl;

    if (isExpired) {
      this.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  /**
   * Define valor no cache
   */
  set(key, value) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  /**
   * Remove valor do cache
   */
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  /**
   * Limpa todo o cache
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }

  /**
   * Limpa cache expirado
   */
  cleanup() {
    for (const [key] of this.timestamps) {
      const type = key.split(':')[0];
      const ttl = this.getTTL(type);
      const timestamp = this.timestamps.get(key);
      if (Date.now() - timestamp > ttl) {
        this.delete(key);
      }
    }
  }
}

export const cacheManager = new QueryCache();

/**
 * Hook para usar cache com React Query
 */
export const useCachedQuery = (queryKey, queryFn, ttl = null) => {
  const cacheKey = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;
  
  return {
    queryKey,
    queryFn: async () => {
      const cached = cacheManager.get(cacheKey);
      if (cached) return cached;
      
      const result = await queryFn();
      if (result) {
        cacheManager.set(cacheKey, result);
      }
      return result;
    }
  };
};