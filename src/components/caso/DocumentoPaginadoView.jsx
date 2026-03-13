import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Sparkles,
  Shield,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { tipoDocumentoLabels } from '@/config/documentoLabels';
import { analisarDocumentoIndividual } from '@/utils/documentAnalysis';
import { obterUrlsDocumentos, SCHEMAS_DOCUMENTOS, salvarAnaliseHistorico } from './utils/documentAnalysisHelpers';
import { construirPromptDocumento } from './utils/promptBuilder';
import { executarAuditoriaPlen, REGRAS_META } from './validators/crossDocumentAnalysis';

// ─── PDF Viewer inline ────────────────────────────────────────────────────────
function PdfViewerInline({ documento }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!documento) return;
    setLoading(true);
    setSignedUrl(null);
    setZoom(100);
    setRotation(0);

    const { file_url, file_uri } = documento;

    if (file_url) {
      setSignedUrl(file_url);
      setLoading(false);
    } else if (file_uri && !file_uri.startsWith('http')) {
      base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 3600 })
        .then(r => { setSignedUrl(r.signed_url); setLoading(false); })
        .catch(() => setLoading(false));
    } else if (file_uri) {
      setSignedUrl(file_uri);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [documento?.id]);

  if (!documento) return null;

  const nome = (documento.nome_arquivo || '').toLowerCase();
  const isPDF = nome.endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/.test(nome);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom(p => Math.max(p - 10, 50))} disabled={zoom <= 50} className="h-7 w-7 p-0 rounded-lg">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-medium text-slate-600 min-w-[3rem] text-center">{zoom}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(p => Math.min(p + 10, 300))} disabled={zoom >= 300} className="h-7 w-7 p-0 rounded-lg">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-slate-200" />
          <Button variant="outline" size="sm" onClick={() => setRotation(p => (p + 90) % 360)} className="h-7 w-7 p-0 rounded-lg">
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        {signedUrl && (
          <a href={signedUrl} download target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </a>
        )}
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-auto bg-slate-100 flex items-start justify-center" style={{ minHeight: 400 }}>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        ) : isPDF && signedUrl ? (
          <iframe
            src={signedUrl}
            className="w-full rounded"
            style={{ height: 560, transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, transformOrigin: 'top center' }}
          />
        ) : isImage && signedUrl ? (
          <img
            src={signedUrl}
            alt={documento.nome_arquivo}
            className="max-w-full rounded"
            style={{ maxHeight: 540, transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, transformOrigin: 'center' }}
          />
        ) : signedUrl ? (
          <iframe
            src={signedUrl}
            className="w-full rounded"
            title={documento.nome_arquivo}
            style={{ height: 560, transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, transformOrigin: 'top center' }}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400">Arquivo não disponível</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Análise Individual ───────────────────────────────────────────────────────
function AnaliseIndividualCard({ documento, tipoDocumento, hipotese, cliente, casoId }) {
  const [resultadoLocal, setResultadoLocal] = useState(null);
  const [resultadoLLM, setResultadoLLM] = useState(null);
  const [analisando, setAnalisando] = useState(false);

  useEffect(() => {
    if (!documento) return;
    setResultadoLocal(null);
    setResultadoLLM(null);
    analisarDocumentoIndividual(documento)
      .then(r => setResultadoLocal(r))
      .catch(() => {});
  }, [documento?.id]);

  const analisarIA = async () => {
    if (!documento) return;
    setAnalisando(true);
    try {
      const urls = await obterUrlsDocumentos([documento], 1);
      if (!urls.length) { toast.error('Não foi possível obter URL do documento'); return; }
      const prompt = construirPromptDocumento(tipoDocumento, cliente, {});
      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: urls,
        response_json_schema: SCHEMAS_DOCUMENTOS.generico
      });
      setResultadoLLM(resultado);
      try {
        await salvarAnaliseHistorico({
          casoId,
          tipoAnalise: 'individual',
          documentoTipo: tipoDocumento,
          documentoNome: documento.nome_arquivo,
          resultado,
          totalDiscrepancias: (resultado.indicadores_alerta || []).filter(a => a.severidade === 'critica').length,
          statusResultado: resultado.classificacao_final === 'APROVADO' ? 'aprovado' : 'com_ressalvas'
        });
      } catch (_) {}
      toast.success('Análise individual concluída');
    } catch (e) {
      toast.error('Erro na análise: ' + e.message);
    } finally {
      setAnalisando(false);
    }
  };

  const temLocal = resultadoLocal && resultadoLocal.score !== undefined;
  const temLLM = resultadoLLM && resultadoLLM.resumo;

  return (
    <Card className="rounded-2xl border-slate-100">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Análise Individual</p>
              {temLocal && (
                <p className="text-[10px] text-slate-500">Score: {resultadoLocal.score}/100</p>
              )}
            </div>
          </div>
          <Button
            onClick={analisarIA}
            disabled={analisando || !documento}
            size="sm"
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs"
          >
            {analisando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span className="ml-1.5 hidden sm:inline">{temLLM ? 'Re-analisar' : 'Analisar'}</span>
          </Button>
        </div>

        {!temLocal && !temLLM && (
          <p className="text-xs text-slate-500 text-center py-2">
            Clique em "Analisar" para análise com IA
          </p>
        )}

        {temLLM && (
          <div className="space-y-2">
            <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3">{resultadoLLM.resumo}</p>
            {resultadoLLM.checklist_verificacao?.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Checklist</p>
                <div className="space-y-1">
                  {resultadoLLM.checklist_verificacao.slice(0, 6).map((item, idx) => {
                    const isOk = item.status === 'OK';
                    const isCritico = item.status === 'CRÍTICO' || item.status === 'CRITICO';
                    return (
                      <div key={idx} className={`flex items-start gap-2 p-2 rounded-lg ${isOk ? 'bg-emerald-50' : isCritico ? 'bg-red-50' : 'bg-amber-50'}`}>
                        {isOk ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> :
                          isCritico ? <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" /> :
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />}
                        <div>
                          <p className="text-[11px] font-medium text-slate-800">{item.item}</p>
                          {item.observacao && <p className="text-[10px] text-slate-500">{item.observacao}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {resultadoLLM.indicadores_alerta?.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Alertas IA</p>
                <div className="space-y-1">
                  {resultadoLLM.indicadores_alerta.map((alerta, idx) => (
                    <div key={idx} className={`flex items-start gap-2 p-2 rounded-lg ${alerta.severidade === 'critica' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
                      {alerta.severidade === 'critica'
                        ? <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                        : <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />}
                      <div>
                        <p className="text-[11px] font-medium text-slate-800">{alerta.tipo}</p>
                        <p className="text-[10px] text-slate-600">{alerta.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {temLocal && resultadoLocal.problemas?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Problemas Detectados</p>
            <div className="space-y-1">
              {resultadoLocal.problemas.map((p, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-700">{p.mensagem}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Análise Cruzada ──────────────────────────────────────────────────────────
function AnaliseCruzadaCard({ documentos, caso, cliente }) {
  const [analisando, setAnalisando] = useState(false);
  const [resultados, setResultados] = useState(null);

  const executar = async () => {
    setAnalisando(true);
    await new Promise(r => setTimeout(r, 150));
    setResultados(executarAuditoriaPlen(documentos, caso || {}));
    setAnalisando(false);
  };

  const criticos = resultados?.filter(r => r.alertas?.some(a => a.severidade === 'critica')).length || 0;
  const alertas = resultados?.filter(r => r.passado === false && !r.alertas?.some(a => a.severidade === 'critica')).length || 0;

  return (
    <Card className="rounded-2xl border-slate-100">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Auditoria Cruzada</p>
              <p className="text-[10px] text-slate-500">16 regras — IN 1984/Portaria Coana 72</p>
            </div>
          </div>
          <Button onClick={executar} disabled={analisando} size="sm" className="bg-violet-600 hover:bg-violet-700 rounded-xl text-xs gap-1.5">
            {analisando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            {resultados ? 'Re-auditar' : 'Auditar'}
          </Button>
        </div>

        {resultados && (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              {criticos > 0 && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{criticos} crítico{criticos > 1 ? 's' : ''}</span>}
              {alertas > 0 && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{alertas} alerta{alertas > 1 ? 's' : ''}</span>}
              {criticos === 0 && alertas === 0 && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Sem inconsistências</span>}
            </div>
            {resultados.filter(r => r.passado === false).map(res => (
              <div key={res.id} className={`rounded-lg border p-2.5 text-xs ${res.alertas?.some(a => a.severidade === 'critica') ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                <p className="font-semibold text-slate-800 mb-1">{res.id} — {REGRAS_META[res.id]?.titulo}</p>
                {res.alertas?.map((a, i) => <p key={i} className="text-slate-600 ml-2">• {a.mensagem}</p>)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DocumentoPaginadoView({ documentos = [], caso, cliente }) {
  const [paginaAtual, setPaginaAtual] = useState(0);

  // Reset to first page when documentos list changes
  useEffect(() => {
    setPaginaAtual(0);
  }, [documentos.length]);

  if (documentos.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mx-auto mb-4">
          <FileText className="h-8 w-8 text-slate-300" />
        </div>
        <p className="font-medium text-slate-700">Nenhum documento encontrado</p>
        <p className="text-sm text-slate-500 mt-1">Envie documentos na aba "Documentos"</p>
      </div>
    );
  }

  const documento = documentos[paginaAtual];
  const total = documentos.length;
  const hipotese = caso?.hipotese_revisao || 'I';

  return (
    <div className="space-y-4">
      {/* Pagination header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{documento.nome_arquivo}</p>
            <p className="text-xs text-slate-500 truncate">
              {tipoDocumentoLabels[documento.tipo_documento] || documento.tipo_documento}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mobile: dropdown */}
          <div className="sm:hidden flex-1">
            <Select value={String(paginaAtual)} onValueChange={(v) => setPaginaAtual(Number(v))}>
              <SelectTrigger className="rounded-xl h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentos.map((doc, idx) => (
                  <SelectItem key={doc.id} value={String(idx)}>
                    {idx + 1}. {doc.nome_arquivo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page indicator */}
          <div className="hidden sm:flex items-center gap-1">
            {documentos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setPaginaAtual(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${idx === paginaAtual
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.max(p - 1, 0))}
            disabled={paginaAtual === 0}
            className="rounded-xl h-9 w-9 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-500 font-medium">{paginaAtual + 1}/{total}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.min(p + 1, total - 1))}
            disabled={paginaAtual === total - 1}
            className="rounded-xl h-9 w-9 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main layout: viewer + analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Left: PDF Viewer */}
        <div>
          <PdfViewerInline documento={documento} />
        </div>

        {/* Right: Analysis panels */}
        <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 660 }}>
          {/* Document meta */}
          <Card className="rounded-2xl border-slate-100">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Tipo</p>
                  <p className="text-xs text-slate-700 mt-0.5 font-medium">
                    {tipoDocumentoLabels[documento.tipo_documento] || documento.tipo_documento}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Status</p>
                  <Badge variant="outline" className={`mt-0.5 text-[10px] ${documento.status_analise === 'aprovado' ? 'border-emerald-200 text-emerald-700' :
                    documento.status_analise === 'reprovado' ? 'border-red-200 text-red-700' :
                      documento.status_analise === 'com_ressalvas' ? 'border-amber-200 text-amber-700' :
                        'border-slate-200 text-slate-500'}`}>
                    {documento.status_analise || 'pendente'}
                  </Badge>
                </div>
                {documento.data_documento && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Data</p>
                    <p className="text-xs text-slate-700 mt-0.5">{new Date(documento.data_documento).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
                {documento.periodo_referencia && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Período</p>
                    <p className="text-xs text-slate-700 mt-0.5">{documento.periodo_referencia}</p>
                  </div>
                )}
                {documento.observacoes && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Observações</p>
                    <p className="text-xs text-slate-600 mt-0.5">{documento.observacoes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Individual Analysis */}
          <AnaliseIndividualCard
            key={documento.id}
            documento={documento}
            tipoDocumento={documento.tipo_documento}
            hipotese={hipotese}
            cliente={cliente}
            casoId={caso?.id}
          />

          {/* Cross Analysis */}
          <AnaliseCruzadaCard
            documentos={documentos}
            caso={caso}
            cliente={cliente}
          />
        </div>
      </div>
    </div>
  );
}