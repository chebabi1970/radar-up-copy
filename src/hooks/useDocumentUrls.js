/**
 * Hook customizado para cache de URLs de documentos
 * Utiliza React Query para otimizar requisições e reduzir latência
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Obtém URLs de documentos com cache
 * @param {Array} documentos - Array de documentos
 * @param {object} opcoes - Opções do React Query
 * @returns {object} Resultado da query com URLs
 */
export const useDocumentUrls = (documentos, opcoes = {}) => {
  const queryClient = useQueryClient();
  
  // Gera chave única baseada nos IDs dos documentos
  const documentIds = documentos?.map(doc => doc.id).sort().join(',') || '';
  
  return useQuery({
    queryKey: ['documento-urls', documentIds],
    queryFn: async () => {
      if (!documentos || documentos.length === 0) {
        return [];
      }
      
      // Obtém URLs dos documentos
      const urlsPromises = documentos.map(async (doc) => {
        try {
          // Verifica se já existe no cache
          const cached = queryClient.getQueryData(['documento-url', doc.id]);
          if (cached) {
            return { id: doc.id, url: cached, fromCache: true };
          }
          
          // Faz requisição para obter URL
          const response = await fetch(`/api/documentos/${doc.id}/url`);
          if (!response.ok) {
            throw new Error(`Erro ao obter URL do documento ${doc.id}`);
          }
          
          const data = await response.json();
          
          // Armazena no cache individual
          queryClient.setQueryData(['documento-url', doc.id], data.url, {
            staleTime: 5 * 60 * 1000 // 5 minutos
          });
          
          return { id: doc.id, url: data.url, fromCache: false };
        } catch (erro) {
          console.error(`Erro ao obter URL do documento ${doc.id}:`, erro);
          return { id: doc.id, url: null, erro: erro.message };
        }
      });
      
      const urls = await Promise.all(urlsPromises);
      return urls;
    },
    staleTime: 5 * 60 * 1000, // Cache válido por 5 minutos
    cacheTime: 10 * 60 * 1000, // Mantém no cache por 10 minutos
    enabled: !!documentos && documentos.length > 0,
    ...opcoes
  });
};

/**
 * Obtém URL de um único documento com cache
 * @param {string} documentoId - ID do documento
 * @param {object} opcoes - Opções do React Query
 * @returns {object} Resultado da query com URL
 */
export const useDocumentUrl = (documentoId, opcoes = {}) => {
  return useQuery({
    queryKey: ['documento-url', documentoId],
    queryFn: async () => {
      if (!documentoId) {
        throw new Error('ID do documento não fornecido');
      }
      
      const response = await fetch(`/api/documentos/${documentoId}/url`);
      if (!response.ok) {
        throw new Error(`Erro ao obter URL do documento ${documentoId}`);
      }
      
      const data = await response.json();
      return data.url;
    },
    staleTime: 5 * 60 * 1000, // Cache válido por 5 minutos
    cacheTime: 10 * 60 * 1000, // Mantém no cache por 10 minutos
    enabled: !!documentoId,
    ...opcoes
  });
};

/**
 * Pré-carrega URLs de documentos no cache
 * @param {Array} documentos - Array de documentos
 */
export const usePrefetchDocumentUrls = () => {
  const queryClient = useQueryClient();
  
  return (documentos) => {
    if (!documentos || documentos.length === 0) return;
    
    documentos.forEach((doc) => {
      queryClient.prefetchQuery({
        queryKey: ['documento-url', doc.id],
        queryFn: async () => {
          const response = await fetch(`/api/documentos/${doc.id}/url`);
          if (!response.ok) {
            throw new Error(`Erro ao obter URL do documento ${doc.id}`);
          }
          const data = await response.json();
          return data.url;
        },
        staleTime: 5 * 60 * 1000
      });
    });
  };
};

/**
 * Invalida cache de URLs de documentos
 * @param {string|Array} documentoIds - ID(s) do(s) documento(s)
 */
export const useInvalidateDocumentUrls = () => {
  const queryClient = useQueryClient();
  
  return (documentoIds) => {
    if (Array.isArray(documentoIds)) {
      documentoIds.forEach(id => {
        queryClient.invalidateQueries(['documento-url', id]);
      });
    } else {
      queryClient.invalidateQueries(['documento-url', documentoIds]);
    }
    
    // Invalida também queries de múltiplos documentos
    queryClient.invalidateQueries(['documento-urls']);
  };
};
