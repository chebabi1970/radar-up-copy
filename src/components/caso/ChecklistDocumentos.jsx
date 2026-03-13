/**
 * Checklist Interativo de Documentos
 * Design moderno com categorias colapsáveis e progresso visual
 */

import React, { useState, useMemo } from 'react';
import { isDocumentoObrigatorio, isDocumentoAplicavel, getPeriodoDocumento } from '@/config/documentosPorHipotese';
import { CATEGORIAS_DOCUMENTOS } from '@/config/documentoLabels';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  FileText,
  Upload,
  Eye,
  ChevronDown,
  ChevronUp,
  Shield,
  Sparkles
} from 'lucide-react';

export default function ChecklistDocumentos({ documentos = [], onUploadClick, onViewClick, hipotese = 'I' }) {
  const [categoriasExpandidas, setCategoriasExpandidas] = useState(
    CATEGORIAS_DOCUMENTOS.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  );

  const documentosPorTipo = useMemo(() => {
    const mapa = {};
    documentos.forEach(doc => {
      if (!mapa[doc.tipo_documento]) mapa[doc.tipo_documento] = [];
      mapa[doc.tipo_documento].push(doc);
    });
    return mapa;
  }, [documentos]);

  const categoriasFiltradas = useMemo(() => {
    return CATEGORIAS_DOCUMENTOS.map(categoria => ({
      ...categoria,
      documentos: categoria.documentos.filter(doc => isDocumentoAplicavel(doc.tipo, hipotese))
        .map(doc => ({
          ...doc,
          obrigatorio: isDocumentoObrigatorio(doc.tipo, hipotese),
          periodo: getPeriodoDocumento(doc.tipo, hipotese)
        }))
    })).filter(categoria => categoria.documentos.length > 0);
  }, [hipotese]);

  const estatisticas = useMemo(() => {
    let totalObrigatorios = 0, obrigatoriosPresentes = 0;
    let totalOpcionais = 0, opcionaisPresentes = 0;

    categoriasFiltradas.forEach(categoria => {
      categoria.documentos.forEach(doc => {
        if (doc.obrigatorio) { totalObrigatorios++; if (documentosPorTipo[doc.tipo]) obrigatoriosPresentes++; }
        else { totalOpcionais++; if (documentosPorTipo[doc.tipo]) opcionaisPresentes++; }
      });
    });

    return {
      totalObrigatorios, obrigatoriosPresentes, totalOpcionais, opcionaisPresentes,
      progressoObrigatorios: totalObrigatorios > 0 ? (obrigatoriosPresentes / totalObrigatorios) * 100 : 100,
      completo: obrigatoriosPresentes === totalObrigatorios
    };
  }, [documentosPorTipo, categoriasFiltradas]);

  const toggleCategoria = (id) => setCategoriasExpandidas(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-5">
      {/* Header com Progresso */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-50/80 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />

        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-200">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Checklist de Documentos</h3>
                <p className="text-xs text-slate-500">Progresso da documentação obrigatória</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setCategoriasExpandidas(categoriasFiltradas.reduce((a, c) => ({ ...a, [c.id]: true }), {}))}
                className="text-xs text-slate-500 h-7 rounded-lg">Expandir</Button>
              <Button variant="ghost" size="sm" onClick={() => setCategoriasExpandidas(categoriasFiltradas.reduce((a, c) => ({ ...a, [c.id]: false }), {}))}
                className="text-xs text-slate-500 h-7 rounded-lg">Recolher</Button>
            </div>
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Documentos Obrigatórios</span>
              <span className="text-sm font-bold text-slate-900">{estatisticas.obrigatoriosPresentes}/{estatisticas.totalObrigatorios}</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ease-out ${
                estatisticas.completo ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-indigo-400 to-violet-500'
              }`} style={{ width: `${estatisticas.progressoObrigatorios}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-indigo-50/80 border border-indigo-100 p-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-indigo-600 font-medium">Obrigatórios</p>
                <p className="text-xl font-bold text-indigo-900">{estatisticas.obrigatoriosPresentes}/{estatisticas.totalObrigatorios}</p>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50/80 border border-emerald-100 p-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                <Sparkles className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">Opcionais</p>
                <p className="text-xl font-bold text-emerald-900">{estatisticas.opcionaisPresentes}/{estatisticas.totalOpcionais}</p>
              </div>
            </div>
          </div>

          {estatisticas.completo ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <span className="text-sm font-medium text-emerald-800">Documentação obrigatória completa!</span>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <span className="text-sm font-medium text-amber-800">{estatisticas.totalObrigatorios - estatisticas.obrigatoriosPresentes} documento(s) obrigatório(s) pendente(s)</span>
            </div>
          )}
        </div>
      </div>

      {/* Categorias */}
      {categoriasFiltradas.map(categoria => {
        const expandida = categoriasExpandidas[categoria.id];
        const docsPresentes = categoria.documentos.filter(d => documentosPorTipo[d.tipo]).length;
        const docsObrigatorios = categoria.documentos.filter(d => d.obrigatorio).length;
        const obrigatoriosPresentes = categoria.documentos.filter(d => d.obrigatorio && documentosPorTipo[d.tipo]).length;
        const categoriaCompleta = docsObrigatorios > 0 && obrigatoriosPresentes === docsObrigatorios;

        return (
          <div key={categoria.id} className="rounded-2xl border border-slate-100 bg-white overflow-hidden transition-all hover:shadow-md hover:shadow-slate-100/50">
            <button onClick={() => toggleCategoria(categoria.id)} className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${categoria.gradiente} shadow-sm`}>
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{categoria.nome}</span>
                    {categoriaCompleta && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {docsPresentes}/{categoria.documentos.length} docs
                    {docsObrigatorios > 0 && ` (${obrigatoriosPresentes}/${docsObrigatorios} obrigatórios)`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1">
                  {categoria.documentos.slice(0, 6).map((doc, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${
                      documentosPorTipo[doc.tipo] ? 'bg-emerald-400' : doc.obrigatorio ? 'bg-red-300' : 'bg-slate-200'
                    }`} />
                  ))}
                </div>
                {expandida ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
              </div>
            </button>

            {expandida && (
              <div className="px-4 pb-4 space-y-2">
                {categoria.documentos.map(doc => {
                  const presente = documentosPorTipo[doc.tipo];
                  const quantidade = presente ? presente.length : 0;
                  return (
                    <div key={doc.tipo} className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all ${
                      presente ? 'bg-emerald-50/60 border-emerald-100' : doc.obrigatorio ? 'bg-red-50/30 border-red-100/60' : 'bg-slate-50/50 border-slate-100'
                    }`}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {presente ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${doc.obrigatorio ? 'text-red-300' : 'text-slate-300'}`} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${presente ? 'text-emerald-900' : 'text-slate-700'}`}>{doc.nome}</span>
                            {doc.obrigatorio && !presente && (
                              <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]" variant="outline">Obrigatório</Badge>
                            )}
                            {quantidade > 1 && <Badge variant="outline" className="text-[10px] border-slate-200">{quantidade} arquivos</Badge>}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{doc.descricao}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col gap-1">
                        {presente ? (
                          presente.map((arquivo, idx) => (
                            <Button key={idx} variant="ghost" size="sm" onClick={() => onViewClick && onViewClick(arquivo)} className="rounded-lg h-8 text-xs gap-1 whitespace-nowrap">
                              <Eye className="h-3.5 w-3.5" /> {arquivo.nome_arquivo || `Arquivo ${idx + 1}`}
                            </Button>
                          ))
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => onUploadClick && onUploadClick(doc.tipo)} className="rounded-lg h-8 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                            <Upload className="h-3.5 w-3.5" /> Enviar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}