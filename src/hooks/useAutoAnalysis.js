/**
 * Hook para análise automática em background
 * Executa análise individual e cruzada automaticamente quando documentos são adicionados
 */

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { analisarDocumentoIndividual } from '@/utils/documentAnalysis';
import { executarAnaliseCruzadaCompleta } from '@/utils/crossDocumentAnalysis';
import logger from '@/utils/logger';
import { toast } from 'sonner';

/**
 * Hook para análise automática de documentos
 * @param {string} casoId - ID do caso
 * @param {Array} documentos - Lista de documentos do caso
 * @param {object} cliente - Dados do cliente
 * @param {object} opcoes - Opções de configuração
 * @returns {object} Estado e funções da análise automática
 */
export const useAutoAnalysis = (casoId, documentos = [], cliente = {}, opcoes = {}) => {
  const {
    autoStart = true, // Inicia análise automaticamente
    notificar = true, // Mostra notificações
    intervaloVerificacao = 5000, // Verifica novos documentos a cada 5s
    analisarAoUpload = true // Analisa imediatamente após upload
  } = opcoes;

  const queryClient = useQueryClient();
  const [analisando, setAnalisando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultados, setResultados] = useState({
    individual: [],
    cruzada: null,
    timestamp: null
  });
  const [documentosAnalisados, setDocumentosAnalisados] = useState(new Set());

  /**
   * Executa análise completa (individual + cruzada)
   */
  const executarAnaliseCompleta = useCallback(async (forcar = false) => {
    if (analisando && !forcar) {
      logger.logAnalise('analise_ja_em_andamento', { casoId });
      return;
    }

    if (documentos.length === 0) {
      logger.logAnalise('sem_documentos_para_analisar', { casoId });
      return;
    }

    // Identifica documentos novos (não analisados)
    const documentosNovos = forcar 
      ? documentos 
      : documentos.filter(d => !documentosAnalisados.has(d.id));

    if (documentosNovos.length === 0 && !forcar) {
      logger.logAnalise('nenhum_documento_novo', { casoId });
      return;
    }

    setAnalisando(true);
    setProgresso(0);

    try {
      logger.logAnalise('analise_automatica_iniciada', {
        casoId,
        totalDocumentos: documentos.length,
        documentosNovos: documentosNovos.length,
        forcada: forcar
      });

      if (notificar) {
        toast.info('🔍 Analisando documentos automaticamente...', {
          duration: 2000
        });
      }

      // 1. Análise Individual
      const resultadosIndividuais = [];
      const totalEtapas = documentosNovos.length + 1; // +1 para análise cruzada
      
      for (let i = 0; i < documentosNovos.length; i++) {
        const doc = documentosNovos[i];
        try {
          logger.logDocumento('analisando_documento', {
            casoId,
            documentoId: doc.id,
            tipo: doc.tipo_documento
          });

          const resultado = await analisarDocumentoIndividual(doc);
          resultadosIndividuais.push(resultado);
          
          // Marca como analisado
          setDocumentosAnalisados(prev => new Set([...prev, doc.id]));

          // Atualiza progresso
          const progressoAtual = ((i + 1) / totalEtapas) * 100;
          setProgresso(progressoAtual);

          logger.logDocumento('documento_analisado', {
            casoId,
            documentoId: doc.id,
            valido: resultado.valido,
            score: resultado.score
          });

        } catch (error) {
          logger.error('DOCUMENTO', 'Erro na análise individual', error, {
            casoId,
            documentoId: doc.id
          });
        }
      }

      // Combina resultados novos com anteriores
      const todosResultadosIndividuais = forcar 
        ? resultadosIndividuais
        : [...resultados.individual, ...resultadosIndividuais];

      // 2. Análise Cruzada (sempre executa com todos os documentos)
      setProgresso(95);
      logger.logAnalise('iniciando_analise_cruzada', { casoId });

      const resultadoCruzada = await executarAnaliseCruzadaCompleta(documentos, cliente);
      
      setProgresso(100);

      // Atualiza resultados
      const novosResultados = {
        individual: todosResultadosIndividuais,
        cruzada: resultadoCruzada,
        timestamp: new Date().toISOString()
      };
      setResultados(novosResultados);

      // Salva no cache do React Query
      queryClient.setQueryData(['analise', casoId], novosResultados);

      // Notificações baseadas nos resultados
      if (notificar) {
        const problemasCriticos = resultadoCruzada.resumo.inconsistencias_criticas;
        const score = resultadoCruzada.resumo.score;

        if (problemasCriticos > 0) {
          toast.error(`⚠️ ${problemasCriticos} inconsistência(s) crítica(s) detectada(s)!`, {
            duration: 5000,
            action: {
              label: 'Ver Detalhes',
              onClick: () => {
                // Scroll para seção de inconsistências
                document.getElementById('inconsistencias-criticas')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }
            }
          });
        } else if (score >= 90) {
          toast.success('✅ Análise concluída! Documentação aprovada.', {
            duration: 3000
          });
        } else {
          toast.success('✅ Análise concluída!', {
            duration: 2000
          });
        }
      }

      logger.logAnalise('analise_automatica_concluida', {
        casoId,
        documentosAnalisados: todosResultadosIndividuais.length,
        score: resultadoCruzada.resumo.score,
        inconsistenciasCriticas: resultadoCruzada.resumo.inconsistencias_criticas
      });

    } catch (error) {
      logger.error('ANALISE', 'Erro na análise automática', error, { casoId });
      
      if (notificar) {
        toast.error('Erro ao analisar documentos. Tente novamente.', {
          duration: 4000
        });
      }
    } finally {
      setAnalisando(false);
      setProgresso(0);
    }
  }, [casoId, documentos, cliente, analisando, documentosAnalisados, notificar, queryClient, resultados.individual]);

  /**
   * Mutation para análise manual
   */
  const analiseMutation = useMutation({
    mutationFn: () => executarAnaliseCompleta(true),
    onSuccess: () => {
      queryClient.invalidateQueries(['analise', casoId]);
    }
  });

  /**
   * Efeito para análise automática ao adicionar documentos
   */
  useEffect(() => {
    if (!autoStart || !analisarAoUpload) return;

    // Verifica se há documentos novos
    const documentosNovos = documentos.filter(d => !documentosAnalisados.has(d.id));
    
    if (documentosNovos.length > 0 && !analisando) {
      // Aguarda 2 segundos antes de iniciar (debounce)
      const timer = setTimeout(() => {
        executarAnaliseCompleta(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [documentos, autoStart, analisarAoUpload, documentosAnalisados, analisando, executarAnaliseCompleta]);

  /**
   * Efeito para verificação periódica
   * Desabilitado para evitar sobrecarga da plataforma com chamadas contínuas de LLM
   */
  // useEffect(() => {
  //   if (!autoStart || !intervaloVerificacao) return;
  //   const interval = setInterval(() => {
  //     const documentosNovos = documentos.filter(d => !documentosAnalisados.has(d.id));
  //     if (documentosNovos.length > 0 && !analisando) {
  //       executarAnaliseCompleta(false);
  //     }
  //   }, intervaloVerificacao);
  //   return () => clearInterval(interval);
  // }, [autoStart, intervaloVerificacao, documentos, documentosAnalisados, analisando, casoId, executarAnaliseCompleta]);

  /**
   * Força nova análise completa
   */
  const forcarAnalise = useCallback(() => {
    setDocumentosAnalisados(new Set()); // Limpa cache
    return executarAnaliseCompleta(true);
  }, [executarAnaliseCompleta]);

  /**
   * Limpa cache de análises
   */
  const limparCache = useCallback(() => {
    setDocumentosAnalisados(new Set());
    setResultados({
      individual: [],
      cruzada: null,
      timestamp: null
    });
    queryClient.removeQueries(['analise', casoId]);
    
    logger.logAnalise('cache_limpo', { casoId });
  }, [casoId, queryClient]);

  return {
    // Estado
    analisando,
    progresso,
    resultados,
    
    // Estatísticas
    totalDocumentos: documentos.length,
    documentosAnalisadosCount: documentosAnalisados.size,
    documentosPendentes: documentos.length - documentosAnalisados.size,
    
    // Funções
    executarAnalise: executarAnaliseCompleta,
    forcarAnalise,
    limparCache,
    analiseMutation,
    
    // Flags
    temResultados: resultados.individual.length > 0 || resultados.cruzada !== null,
    analiseCompleta: documentosAnalisados.size === documentos.length && resultados.cruzada !== null
  };
};

export default useAutoAnalysis;
