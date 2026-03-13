/**
 * Utilitários para otimização de queries ao banco de dados
 * Garante que apenas dados essenciais sejam carregados
 */
import { logInfo } from './logger';

/**
 * Mapeia entidades para campos mínimos necessários
 * Reduz payload ao buscar apenas o essencial
 */
export const MINIMAL_FIELDS = {
  caso: ['id', 'cliente_id', 'numero_caso', 'status', 'hipotese_revisao', 'modalidade_pretendida', 'created_date'],
  cliente: ['id', 'razao_social', 'cnpj', 'email', 'telefone'],
  documento: ['id', 'caso_id', 'tipo_documento', 'nome_arquivo', 'status_analise', 'created_date'],
  checklist: ['id', 'caso_id', 'tipo_documento', 'status', 'obrigatorio'],
};

/**
 * Wrapper que otimiza queries aplicando filtros e campos mínimos
 */
export const optimizedQuery = (entityName, filterObj = {}, limit = null) => {
  logInfo('Query otimizada', { entity: entityName, filterCount: Object.keys(filterObj).length, limit });
  
  return {
    entity: entityName,
    filter: filterObj,
    limit: limit || 100,
    fields: MINIMAL_FIELDS[entityName]
  };
};

/**
 * Agrupa queries relacionadas para evitar múltiplas requisições
 */
export const batchQueries = async (queries, base44Client) => {
  logInfo('Executando batch de queries', { count: queries.length });
  
  try {
    const results = await Promise.all(
      queries.map(q => {
        const entity = base44Client.entities[q.entity];
        if (q.filter) {
          return entity.filter(q.filter, q.limit);
        }
        return entity.list();
      })
    );
    
    return results;
  } catch (error) {
    logInfo('Erro ao executar batch', { error: error.message });
    throw error;
  }
};

/**
 * Calcula o "peso" de um objeto para identificar queries pesadas
 */
export const calculatePayloadSize = (data) => {
  const json = JSON.stringify(data);
  return json.length / 1024; // em KB
};