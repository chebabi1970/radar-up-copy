import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, RefreshCw, Loader2, CheckCircle2, AlertCircle,
  AlertTriangle, Edit3, Check, X, Send, Eye, EyeOff,
  ChevronDown, ChevronRight, Clock, Plus, Trash2, Info
} from 'lucide-react';
import { executarAuditoriaPlen, REGRAS_META } from './validators/crossDocumentAnalysis';
import { toast } from 'sonner';

const TIPO_LABELS = {
  requerimento_das: 'Requerimento DAS',
  documento_identificacao_responsavel: 'Doc. Identificação Responsável',
  procuracao: 'Procuração',
  documento_identificacao_procurador: 'Doc. Identificação Procurador',
  contrato_social: 'Contrato Social',
  certidao_junta_comercial: 'Certidão Junta Comercial',
  extrato_bancario_corrente: 'Extrato Bancário Corrente',
  extrato_bancario_aplicacoes: 'Extrato Bancário Aplicações',
  balancete_verificacao: 'Balancete de Verificação',
  balanco_patrimonial_integralizacao: 'Balanço Patrimonial',
  das_simples_nacional: 'DAS Simples Nacional',
  darf_cprb: 'DARF CPRB',
  contrato_mutuo: 'Contrato de Mútuo',
  comprovante_iof: 'Comprovante IOF',
  outro: 'Outro',
};

function ItemDivergencia({ item, index, onSave, onIgnorar, onResolver }) {
  const [editando, setEditando] = useState(false);
  const [textoEditado, setTextoEditado] = useState(item.texto);

  const handleSave = () => {
    onSave(index, textoEditado);
    setEditando(false);
  };

  const handleCancel = () => {
    setTextoEditado(item.texto);
    setEditando(false);
  };

  const severidadeStyle = {
    critica: 'border-red-200 bg-red-50/40',
    media: 'border-amber-200 bg-amber-50/30',
    leve: 'border-slate-200 bg-slate-50',
  }[item.severidade] || 'border-slate-200 bg-white';

  const badgeStyle = {
    critica: 'bg-red-100 text-red-700',
    media: 'bg-amber-100 text-amber-700',
    leve: 'bg-slate-100 text-slate-600',
  }[item.severidade] || 'bg-slate-100 text-slate-600';

  if (item.ignorado) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 flex items-center justify-between gap-3 opacity-50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <EyeOff className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-400 line-through truncate">{item.texto}</p>
        </div>
        <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-slate-500" onClick={() => onIgnorar(index, false)}>
          Restaurar
        </Button>
      </div>
    );
  }

  if (item.resolvido) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          <p className="text-xs text-slate-500 line-through truncate">{item.texto}</p>
          <Badge className="text-[10px] bg-emerald-100 text-emerald-700 flex-shrink-0">Resolvido</Badge>
        </div>
        <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-slate-500" onClick={() => onResolver(index, false)}>
          Reabrir
        </Button>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${severidadeStyle}`}>
      <div className="flex items-start gap-2">
        <AlertCircle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${item.severidade === 'critica' ? 'text-red-500' : item.severidade === 'media' ? 'text-amber-500' : 'text-slate-400'}`} />
        <div className="flex-1 min-w-0">
          {editando ? (
            <textarea
              className="w-full text-xs border border-blue-200 rounded-lg p-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              rows={3}
              value={textoEditado}
              onChange={e => setTextoEditado(e.target.value)}
              autoFocus
            />
          ) : (
            <p className="text-xs text-slate-700">{item.texto}</p>
          )}
          {item.regra && (
            <p className="text-[10px] text-slate-400 mt-1 font-mono">{item.regra}</p>
          )}
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeStyle}`}>
          {item.severidade === 'critica' ? 'Crítico' : item.severidade === 'media' ? 'Médio' : 'Leve'}
        </span>
      </div>

      <div className="flex items-center gap-2 justify-end">
        {editando ? (
          <>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-500" onClick={handleCancel}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancelar
            </Button>
            <Button size="sm" className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
              <Check className="h-3.5 w-3.5 mr-1" /> Salvar
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-500" onClick={() => onIgnorar(index, true)}>
              <EyeOff className="h-3.5 w-3.5 mr-1" /> Ignorar
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-500" onClick={() => setEditando(true)}>
              <Edit3 className="h-3.5 w-3.5 mr-1" /> Editar
            </Button>
            <Button size="sm" className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => onResolver(index, true)}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolver
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ParecerEditavel({ caso, documentos = [], cliente }) {
  const queryClient = useQueryClient();

  const [analisando, setAnalisando] = useState(false);
  const [divergencias, setDivergencias] = useState([]);
  const [ultimaAnalise, setUltimaAnalise] = useState(null);
  const [totalAnterior, setTotalAnterior] = useState(null);
  const [observacaoGeral, setObservacaoGeral] = useState(caso?.observacoes || '');
  const [editandoObs, setEditandoObs] = useState(false);
  const [mostrarIgnorados, setMostrarIgnorados] = useState(false);
  const [mostrarResolvidos, setMostrarResolvidos] = useState(true);

  // Carregar divergências salvas no caso
  useEffect(() => {
    if (caso?.divergencias_encontradas?.length) {
      const divs = caso.divergencias_encontradas.map(d => ({
        texto: d.descricao || d.texto || '',
        severidade: d.severidade || 'media',
        regra: d.tipo || '',
        ignorado: d.resolvida === 'ignorado',
        resolvido: d.resolvida === true,
        id: d.id || Math.random().toString(36).slice(2),
      }));
      setDivergencias(divs);
    }
  }, [caso?.id]);

  const rodarAnalise = async () => {
    if (!documentos.length) {
      toast.error('Nenhum documento disponível para análise.');
      return;
    }
    setAnalisando(true);
    setTotalAnterior(divergencias.filter(d => !d.ignorado && !d.resolvido).length);
    await new Promise(r => setTimeout(r, 400));

    const resultados = executarAuditoriaPlen(documentos, caso);
    const novas = [];

    resultados.forEach(res => {
      if (res.passado === false && res.alertas?.length) {
        const meta = REGRAS_META[res.id] || {};
        res.alertas.forEach(alerta => {
          novas.push({
            id: `${res.id}_${Math.random().toString(36).slice(2)}`,
            texto: alerta.mensagem || JSON.stringify(alerta),
            severidade: alerta.severidade || 'media',
            regra: `${meta.titulo || res.id} — ${meta.norm || ''}`,
            ignorado: false,
            resolvido: false,
          });
        });
      }
    });

    // Manter itens já ignorados/resolvidos manualmente, adicionar novos
    const mantidos = divergencias.filter(d => d.ignorado || d.resolvido);
    const idsNovos = new Set(novas.map(n => n.texto));
    const mantidosFiltrados = mantidos.filter(m => !idsNovos.has(m.texto));

    const merged = [...novas, ...mantidosFiltrados];
    setDivergencias(merged);
    setUltimaAnalise(new Date());

    const novasPendentes = novas.filter(n => !n.resolvido && !n.ignorado).length;
    const anterior = divergencias.filter(d => !d.ignorado && !d.resolvido).length;
    if (novasPendentes < anterior) {
      toast.success(`✅ ${anterior - novasPendentes} inconsistência(s) resolvida(s) em relação à última análise!`);
    } else if (novasPendentes === 0) {
      toast.success('Nenhuma inconsistência encontrada!');
    } else {
      toast.info(`Análise concluída. ${novasPendentes} item(ns) pendente(s).`);
    }

    setAnalisando(false);
    salvarNoCaso(merged);
  };

  const salvarNoCaso = async (divs) => {
    const payload = divs.map(d => ({
      id: d.id,
      descricao: d.texto,
      tipo: d.regra,
      severidade: d.severidade,
      resolvida: d.resolvido ? true : d.ignorado ? 'ignorado' : false,
    }));
    await base44.entities.Caso.update(caso.id, { divergencias_encontradas: payload });
    queryClient.invalidateQueries({ queryKey: ['caso', caso.id] });
  };

  const handleSaveTexto = (index, novoTexto) => {
    const updated = [...divergencias];
    updated[index] = { ...updated[index], texto: novoTexto };
    setDivergencias(updated);
    salvarNoCaso(updated);
  };

  const handleIgnorar = (index, valor) => {
    const updated = [...divergencias];
    updated[index] = { ...updated[index], ignorado: valor, resolvido: false };
    setDivergencias(updated);
    salvarNoCaso(updated);
    toast.info(valor ? 'Item ignorado no parecer.' : 'Item restaurado.');
  };

  const handleResolver = (index, valor) => {
    const updated = [...divergencias];
    updated[index] = { ...updated[index], resolvido: valor, ignorado: false };
    setDivergencias(updated);
    salvarNoCaso(updated);
    if (valor) toast.success('Divergência marcada como resolvida.');
  };

  const salvarObservacao = async () => {
    await base44.entities.Caso.update(caso.id, { observacoes: observacaoGeral });
    queryClient.invalidateQueries({ queryKey: ['caso', caso.id] });
    setEditandoObs(false);
    toast.success('Observação salva.');
  };

  const gerarTextoEmail = () => {
    const pendentes = divergencias.filter(d => !d.ignorado && !d.resolvido);
    const resolvidas = divergencias.filter(d => d.resolvido);
    const docsList = documentos.map(d => `• ${TIPO_LABELS[d.tipo_documento] || d.tipo_documento} — ${d.nome_arquivo}`).join('\n');

    let texto = `Prezado(a),\n\nSegue o relatório de conformidade do caso ${caso.numero_caso || caso.id}.\n\n`;
    texto += `=== DOCUMENTOS RECEBIDOS ===\n${docsList || 'Nenhum documento registrado.'}\n\n`;

    if (pendentes.length > 0) {
      texto += `=== INCONSISTÊNCIAS PENDENTES (${pendentes.length}) ===\n`;
      pendentes.forEach((d, i) => {
        texto += `${i + 1}. [${d.severidade?.toUpperCase()}] ${d.texto}\n`;
      });
      texto += '\n';
    }

    if (resolvidas.length > 0) {
      texto += `=== ITENS RESOLVIDOS (${resolvidas.length}) ===\n`;
      resolvidas.forEach((d, i) => {
        texto += `${i + 1}. ✓ ${d.texto}\n`;
      });
      texto += '\n';
    }

    if (observacaoGeral) {
      texto += `=== OBSERVAÇÕES ===\n${observacaoGeral}\n\n`;
    }

    texto += `Atenciosamente,\nRADAR UP — Sistema de Conformidade Documental\nData: ${new Date().toLocaleDateString('pt-BR')}`;
    return texto;
  };

  const copiarEmail = () => {
    navigator.clipboard.writeText(gerarTextoEmail());
    toast.success('Texto do relatório copiado! Cole no seu e-mail ou WhatsApp.');
  };

  const pendentes = divergencias.filter(d => !d.ignorado && !d.resolvido);
  const resolvidos = divergencias.filter(d => d.resolvido);
  const ignorados = divergencias.filter(d => d.ignorado);
  const criticos = pendentes.filter(d => d.severidade === 'critica');
  const docsRecebidos = documentos.filter(d => d.status_versao !== 'obsoleta');

  return (
    <div className="space-y-4">

      {/* Header do Parecer */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-50/80 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Parecer de Conformidade</h3>
              <p className="text-xs text-slate-500">
                Relatório editável — edite, ignore ou resolva cada ponto antes de enviar ao cliente
              </p>
              {ultimaAnalise && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  Última análise: {ultimaAnalise.toLocaleTimeString('pt-BR')}
                  {totalAnterior !== null && pendentes.length < totalAnterior && (
                    <span className="ml-2 text-emerald-600 font-semibold">
                      ↓ {totalAnterior - pendentes.length} resolvida(s)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={rodarAnalise}
              disabled={analisando || !documentos.length}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              size="sm"
            >
              {analisando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {divergencias.length ? 'Re-analisar' : 'Analisar'}
            </Button>
            {divergencias.length > 0 && (
              <Button onClick={copiarEmail} variant="outline" size="sm" className="gap-2">
                <Send className="h-4 w-4" />
                Copiar Relatório
              </Button>
            )}
          </div>
        </div>

        {/* Cards de resumo */}
        {divergencias.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-center">
              <p className="text-xl font-black text-red-600">{criticos.length}</p>
              <p className="text-[11px] font-medium text-red-500">Críticos</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
              <p className="text-xl font-black text-amber-600">{pendentes.filter(d => d.severidade !== 'critica').length}</p>
              <p className="text-[11px] font-medium text-amber-500">Alertas</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
              <p className="text-xl font-black text-emerald-600">{resolvidos.length}</p>
              <p className="text-[11px] font-medium text-emerald-500">Resolvidos</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-xl font-black text-slate-500">{docsRecebidos.length}</p>
              <p className="text-[11px] font-medium text-slate-400">Docs Recebidos</p>
            </div>
          </div>
        )}
      </div>

      {/* Documentos Recebidos */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
        <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          Documentos Recebidos ({docsRecebidos.length})
        </h4>
        {docsRecebidos.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Nenhum documento enviado ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {docsRecebidos.map((doc, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-xs text-slate-700 font-medium flex-1 min-w-0 truncate">
                  {TIPO_LABELS[doc.tipo_documento] || doc.tipo_documento}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{doc.nome_arquivo}</span>
                <Badge className={`text-[9px] px-1.5 py-0 flex-shrink-0 ${
                  doc.status_analise === 'aprovado' ? 'bg-emerald-100 text-emerald-700' :
                  doc.status_analise === 'reprovado' ? 'bg-red-100 text-red-700' :
                  doc.status_analise === 'com_ressalvas' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {doc.status_analise === 'aprovado' ? 'Aprovado' :
                   doc.status_analise === 'reprovado' ? 'Reprovado' :
                   doc.status_analise === 'com_ressalvas' ? 'Ressalvas' : 'Pendente'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divergências / Inconsistências */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Inconsistências Pendentes ({pendentes.length})
          </h4>
          {pendentes.length === 0 && divergencias.length > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs">Tudo resolvido ✓</Badge>
          )}
        </div>

        {!divergencias.length && !analisando && (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Clique em "Analisar" para identificar inconsistências nos documentos.</p>
          </div>
        )}

        {analisando && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <div>
              <p className="text-sm font-medium text-blue-700">Analisando documentos…</p>
              <p className="text-xs text-blue-500">Comparando com análise anterior e identificando diferenças</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {pendentes.map((item, i) => (
            <ItemDivergencia
              key={item.id || i}
              item={item}
              index={divergencias.indexOf(item)}
              onSave={handleSaveTexto}
              onIgnorar={handleIgnorar}
              onResolver={handleResolver}
            />
          ))}
        </div>

        {/* Resolvidos */}
        {resolvidos.length > 0 && (
          <div className="pt-2">
            <button
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              onClick={() => setMostrarResolvidos(v => !v)}
            >
              {mostrarResolvidos ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {resolvidos.length} item(ns) resolvido(s)
            </button>
            {mostrarResolvidos && (
              <div className="mt-2 space-y-2">
                {resolvidos.map((item, i) => (
                  <ItemDivergencia
                    key={item.id || i}
                    item={item}
                    index={divergencias.indexOf(item)}
                    onSave={handleSaveTexto}
                    onIgnorar={handleIgnorar}
                    onResolver={handleResolver}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ignorados */}
        {ignorados.length > 0 && (
          <div className="pt-1">
            <button
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              onClick={() => setMostrarIgnorados(v => !v)}
            >
              {mostrarIgnorados ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {ignorados.length} item(ns) ignorado(s)
            </button>
            {mostrarIgnorados && (
              <div className="mt-2 space-y-2">
                {ignorados.map((item, i) => (
                  <ItemDivergencia
                    key={item.id || i}
                    item={item}
                    index={divergencias.indexOf(item)}
                    onSave={handleSaveTexto}
                    onIgnorar={handleIgnorar}
                    onResolver={handleResolver}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Observações do consultor */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-slate-400" />
            Observações do Consultor
          </h4>
          {!editandoObs && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-500" onClick={() => setEditandoObs(true)}>
              <Edit3 className="h-3.5 w-3.5 mr-1" /> Editar
            </Button>
          )}
        </div>

        {editandoObs ? (
          <div className="space-y-2">
            <textarea
              className="w-full text-sm border border-blue-200 rounded-xl p-3 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 min-h-[100px]"
              value={observacaoGeral}
              onChange={e => setObservacaoGeral(e.target.value)}
              placeholder="Adicione observações, orientações ao cliente, estratégias de regularização…"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" className="h-7 px-3 text-xs" onClick={() => { setObservacaoGeral(caso?.observacoes || ''); setEditandoObs(false); }}>
                Cancelar
              </Button>
              <Button size="sm" className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700" onClick={salvarObservacao}>
                <Check className="h-3.5 w-3.5 mr-1" /> Salvar
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-h-[60px] rounded-xl bg-slate-50 border border-slate-100 p-3">
            {observacaoGeral ? (
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{observacaoGeral}</p>
            ) : (
              <p className="text-xs text-slate-400 italic">Clique em "Editar" para adicionar observações ao relatório final.</p>
            )}
          </div>
        )}
      </div>

      {/* Preview do Relatório */}
      {divergencias.length > 0 && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-400" />
              Preview do Relatório (para copiar e enviar)
            </h4>
            <Button onClick={copiarEmail} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 h-7 px-3 text-xs">
              <Send className="h-3.5 w-3.5" />
              Copiar Tudo
            </Button>
          </div>
          <pre className="text-[11px] text-slate-600 whitespace-pre-wrap font-mono bg-white rounded-xl border border-blue-100 p-4 max-h-64 overflow-y-auto leading-relaxed">
            {gerarTextoEmail()}
          </pre>
        </div>
      )}
    </div>
  );
}