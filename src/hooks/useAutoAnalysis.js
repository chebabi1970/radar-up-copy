/**
 * Hook para análise automática em background
 * Executa análise individual e cruzada automaticamente quando documentos são adicionados
 */

import { useEffect, useState, useCallback, useRef } from 'react';
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
    autoStart = true,
    notificar = true,
    intervaloVerificacao = 5000,
    analisarAoUpload = true
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

  // Refs para guardar valores atuais sem forçar recriação de executarAnaliseCompleta
  const analisandoRef = useRef(false);
  const documentosAnalisadosRef = useRef(new Set());
  const resultadosIndividualRef = useRef([]);

  /**
   * Executa análise completa (individual + cruzada)
   * Usa refs para o estado interno para evitar recriações excessivas do useCallback
   */
  const executarAnaliseCompleta = useCallback(async (forcar = false) => {
    if (analisandoRef.current && !forcar) {
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
      : documentos.filter(d => !documentosAnalisadosRef.current.has(d.id));

    if (documentosNovos.length === 0 && !forcar) {
      logger.logAnalise('nenhum_documento_novo', { casoId });
      return;
    }

    analisandoRef.current = true;
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
      const totalEtapas = documentosNovos.length + 1;

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

          // Atualiza ref imediatamente (sem re-render)
          documentosAnalisadosRef.current = new Set([...documentosAnalisadosRef.current, doc.id]);
          // Atualiza estado (causa re-render, mas agora não recria executarAnaliseCompleta)
          setDocumentosAnalisados(prev => new Set([...prev, doc.id]));

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
        : [...resultadosIndividualRef.current, ...resultadosIndividuais];

      resultadosIndividualRef.current = todosResultadosIndividuais;

      // 2. Análise Cruzada
      setProgresso(95);
      logger.logAnalise('iniciando_analise_cruzada', { casoId });

      const resultadoCruzada = await executarAnaliseCruzadaCompleta(documentos, cliente);

      setProgresso(100);

      const novosResultados = {
        individual: todosResultadosIndividuais,
        cruzada: resultadoCruzada,
        timestamp: new Date().toISOString()
      };
      setResultados(novosResultados);

      queryClient.setQueryData(['analise', casoId], novosResultados);

      if (notificar) {
        const problemasCriticos = resultadoCruzada?.resumo?.inconsistencias_criticas ?? 0;
        const score = resultadoCruzada?.resumo?.score ?? 0;

        if (problemasCriticos > 0) {
          toast.error(`⚠️ ${problemasCriticos} inconsistência(s) crítica(s) detectada(s)!`, {
            duration: 5000,
            action: {
              label: 'Ver Detalhes',
              onClick: () => {
                document.getElementById('inconsistencias-criticas')?.scrollIntoView({
                  behavior: 'smooth'
                });
              }
            }
          });
        } else if (score >= 90) {
          toast.success('✅ Análise concluída! Documentação aprovada.', { duration: 3000 });
        } else {
          toast.success('✅ Análise concluída!', { duration: 2000 });
        }
      }

      logger.logAnalise('analise_automatica_concluida', {
        casoId,
        documentosAnalisados: todosResultadosIndividuais.length,
        score: resultadoCruzada?.resumo?.score,
        inconsistenciasCriticas: resultadoCruzada?.resumo?.inconsistencias_criticas
      });

    } catch (error) {
      logger.error('ANALISE', 'Erro na análise automática', error, { casoId });

      if (notificar) {
        toast.error('Erro ao analisar documentos. Tente novamente.', { duration: 4000 });
      }
    } finally {
      analisandoRef.current = false;
      setAnalisando(false);
      setProgresso(0);
    }
  // Removidos: analisando, documentosAnalisados, resultados.individual
  // Esses valores agora são acessados via refs, evitando recriações desnecessárias
  }, [casoId, documentos, cliente, notificar, queryClient]);

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

    const documentosNovos = documentos.filter(d => !documentosAnalisadosRef.current.has(d.id));

    if (documentosNovos.length > 0 && !analisandoRef.current) {
      const timer = setTimeout(() => {
        executarAnaliseCompleta(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [documentos, autoStart, analisarAoUpload, executarAnaliseCompleta]);

  /**
   * Efeito para verificação periódica
   * Desabilitado para evitar sobrecarga da plataforma com chamadas contínuas de LLM
   */
  useEffect(() => {
    if (!autoStart || !intervaloVerificacao) return;

    const interval = setInterval(() => {
      const documentosNovos = documentos.filter(d => !documentosAnalisadosRef.current.has(d.id));

      if (documentosNovos.length > 0 && !analisandoRef.current) {
        logger.logAnalise('verificacao_periodica_detectou_novos', {
          casoId,
          documentosNovos: documentosNovos.length
        });
        executarAnaliseCompleta(false);
      }
    }, intervaloVerificacao);

    return () => clearInterval(interval);
  }, [autoStart, intervaloVerificacao, documentos, casoId, executarAnaliseCompleta]);

  /**
   * Força nova análise completa
   */
  const forcarAnalise = useCallback(() => {
    documentosAnalisadosRef.current = new Set();
    resultadosIndividualRef.current = [];
    setDocumentosAnalisados(new Set());
    return executarAnaliseCompleta(true);
  }, [executarAnaliseCompleta]);

  /**
   * Limpa cache de análises
   */
  const limparCache = useCallback(() => {
    documentosAnalisadosRef.current = new Set();
    resultadosIndividualRef.current = [];
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
    analisando,
    progresso,
    resultados,
    totalDocumentos: documentos.length,
    documentosAnalisadosCount: documentosAnalisados.size,
    documentosPendentes: documentos.length - documentosAnalisados.size,
    executarAnalise: executarAnaliseCompleta,
    forcarAnalise,
    limparCache,
    analiseMutation,
    temResultados: resultados.individual.length > 0 || resultados.cruzada !== null,
    analiseCompleta: documentosAnalisados.size === documentos.length && resultados.cruzada !== null
  };
};

export default useAutoAnalysis;
