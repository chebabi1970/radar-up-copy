import React, { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { isDocumentoAplicavel, isDocumentoObrigatorio } from '@/config/documentosPorHipotese';
import { CATEGORIAS_DOCUMENTOS, tipoDocumentoLabels } from '@/config/documentoLabels';
import { analisarDocumentoIndividual } from '@/utils/documentAnalysis';
import { obterUrlsDocumentos, SCHEMAS_DOCUMENTOS, salvarAnaliseHistorico } from './utils/documentAnalysisHelpers';
import { construirPromptDocumento } from './utils/promptBuilder';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import DocumentosSidebar from './analise-individual/DocumentosSidebar';
import DocumentViewerInline from './analise-individual/DocumentViewerInline';
import ResumoDocumento from './analise-individual/ResumoDocumento';
import ResultadoAnaliseDetalhado from './analise-individual/ResultadoAnaliseDetalhado';

export default function AnaliseIndividualTab({ caso, documentos, cliente, onDocumentosChange }) {
  const hipotese = caso?.hipotese_revisao || 'I';
  const [tipoSelecionado, setTipoSelecionado] = useState(null);
  const [docSelecionado, setDocSelecionado] = useState(null);
  const [resultadosAnalise, setResultadosAnalise] = useState({});
  const [resultadosLLM, setResultadosLLM] = useState({});
  const [analisando, setAnalisando] = useState(false);
  const queryClient = useQueryClient();

  const documentosPorTipo = useMemo(() => {
    const mapa = {};
    documentos.forEach(doc => {
      if (!mapa[doc.tipo_documento]) mapa[doc.tipo_documento] = [];
      mapa[doc.tipo_documento].push(doc);
    });
    return mapa;
  }, [documentos]);

  // Flat list of all applicable document types for mobile dropdown
  const tiposAplicaveis = useMemo(() => {
    const tipos = [];
    CATEGORIAS_DOCUMENTOS.forEach(cat => {
      cat.documentos.forEach(doc => {
        if (isDocumentoAplicavel(doc.tipo, hipotese)) {
          tipos.push({ ...doc, obrigatorio: isDocumentoObrigatorio(doc.tipo, hipotese) });
        }
      });
    });
    return tipos;
  }, [hipotese]);

  // Auto-select first type if none selected
  React.useEffect(() => {
    if (!tipoSelecionado && tiposAplicaveis.length > 0) {
      setTipoSelecionado(tiposAplicaveis[0].tipo);
    }
  }, [tiposAplicaveis, tipoSelecionado]);

  // Reset doc selection and loading state when type changes
  React.useEffect(() => {
    setDocSelecionado(null);
    setAnalisando(false);
  }, [tipoSelecionado]);

  const documentosDesseTipo = tipoSelecionado ? (documentosPorTipo[tipoSelecionado] || []) : [];
  const documentoAtual = docSelecionado || documentosDesseTipo[0] || null;

  // Run local analysis
  const executarAnaliseLocal = useCallback(async () => {
    if (!documentoAtual) return;
    try {
      const resultado = await analisarDocumentoIndividual(documentoAtual);
      setResultadosAnalise(prev => ({ ...prev, [tipoSelecionado]: resultado }));
      return resultado;
    } catch (error) {
      console.error('Erro na análise local:', error);
    }
  }, [documentoAtual, tipoSelecionado]);

  // Run LLM analysis (accepts optional corrections from contest mode)
  const executarAnaliseIA = useCallback(async (opcoes = {}) => {
    if (!documentoAtual || documentosDesseTipo.length === 0) return;
    setAnalisando(true);
    try {
      // Run local analysis first
      await executarAnaliseLocal();

      // Get file URLs
      const urls = await obterUrlsDocumentos(documentosDesseTipo, 3);
      if (urls.length === 0) {
        toast.error('Não foi possível obter URLs dos documentos');
        setAnalisando(false);
        return;
      }

      // Build prompt with optional corrections
      const prompt = construirPromptDocumento(tipoSelecionado, cliente, {
        correcoesUsuario: opcoes.correcoesUsuario,
        observacoesUsuario: opcoes.observacoesUsuario
      });

      // Timeout de 120 segundos para evitar travamento
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite excedido (120s). O documento pode ser grande demais. Tente novamente.')), 120000)
      );
      const resultado = await Promise.race([
        base44.integrations.Core.InvokeLLM({
          prompt,
          file_urls: urls,
          response_json_schema: SCHEMAS_DOCUMENTOS.generico
        }),
        timeoutPromise
      ]);

      setResultadosLLM(prev => ({ ...prev, [tipoSelecionado]: resultado }));

      // Save to history
      try {
        await salvarAnaliseHistorico({
          casoId: caso.id,
          tipoAnalise: opcoes.correcoesUsuario?.length > 0 ? 'individual_corrigida' : 'individual',
          documentoTipo: tipoSelecionado,
          documentoNome: documentoAtual.nome_arquivo,
          resultado: resultado,
          totalDiscrepancias: (resultado.indicadores_alerta || []).filter(a => a.severidade === 'critica').length,
          statusResultado: resultado.classificacao_final === 'APROVADO' ? 'aprovado' : 'com_ressalvas'
        });
      } catch (e) {
        // Silent fail for history save
      }

      const msg = opcoes.correcoesUsuario?.length > 0
        ? 'Re-análise com correções concluída'
        : 'Análise concluída';
      toast.success(msg);
    } catch (error) {
      console.error('Erro na análise IA:', error);
      toast.error('Erro ao analisar documento: ' + error.message);
    } finally {
      setAnalisando(false);
    }
  }, [documentoAtual, documentosDesseTipo, tipoSelecionado, cliente, caso?.id, executarAnaliseLocal]);

  // Auto-run local analysis when document changes
  React.useEffect(() => {
    if (documentoAtual && !resultadosAnalise[tipoSelecionado]) {
      executarAnaliseLocal();
    }
  }, [documentoAtual, tipoSelecionado]);

  const handleSelectTipo = (tipo) => {
    setTipoSelecionado(tipo);
    setDocSelecionado(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-200">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Análise Individual de Documentos</h3>
          <p className="text-xs text-slate-500">Selecione um tipo de documento para visualizar e analisar</p>
        </div>
      </div>

      {/* Mobile: Dropdown selector */}
      <div className="lg:hidden">
        <Select value={tipoSelecionado || ''} onValueChange={handleSelectTipo}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Selecione o tipo de documento" />
          </SelectTrigger>
          <SelectContent>
            {tiposAplicaveis.map(doc => (
              <SelectItem key={doc.tipo} value={doc.tipo}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${documentosPorTipo[doc.tipo] ? 'bg-emerald-500' : doc.obrigatorio ? 'bg-red-300' : 'bg-slate-300'}`} />
                  {doc.nome}
                  {documentosPorTipo[doc.tipo] && <span className="text-[10px] text-slate-400">({documentosPorTipo[doc.tipo].length})</span>}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: Sidebar + Content */}
      <div className="flex gap-5">
        {/* Sidebar (desktop only) */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-4 rounded-2xl border border-slate-100 bg-white p-3" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <DocumentosSidebar
              hipotese={hipotese}
              documentos={documentos}
              tipoSelecionado={tipoSelecionado}
              onSelectTipo={handleSelectTipo}
              resultadosAnalise={resultadosAnalise}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {tipoSelecionado ? (
            <>
              {/* Document title */}
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" />
                <h4 className="text-lg font-semibold text-slate-900">
                  {tipoDocumentoLabels[tipoSelecionado] || tipoSelecionado}
                </h4>
                {documentosDesseTipo.length > 0 && (
                  <span className="text-sm text-slate-500">({documentosDesseTipo.length} arquivo(s))</span>
                )}
              </div>

              {/* Viewer */}
              {documentosDesseTipo.length > 0 && (
                <DocumentViewerInline
                  documento={documentoAtual}
                  documentos={documentosDesseTipo}
                  onSelectDoc={setDocSelecionado}
                />
              )}

              {/* Summary */}
              <ResumoDocumento
                documento={documentoAtual}
                tipoDocumento={tipoSelecionado}
                hipotese={hipotese}
              />

              {/* Analysis Results */}
              {documentoAtual && (
                <ResultadoAnaliseDetalhado
                  resultadoLocal={resultadosAnalise[tipoSelecionado]}
                  resultadoLLM={resultadosLLM[tipoSelecionado]}
                  documento={documentoAtual}
                  onReanalizar={executarAnaliseLocal}
                  onAnalisarIA={executarAnaliseIA}
                  analisando={analisando}
                />
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">Selecione um tipo de documento para começar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}