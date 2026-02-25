import React, { useMemo } from 'react';
import { isDocumentoObrigatorio, isDocumentoAplicavel } from '@/config/documentosPorHipotese';
import { CATEGORIAS_DOCUMENTOS } from '@/config/documentoLabels';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronRight
} from 'lucide-react';

export default function DocumentosSidebar({ hipotese, documentos, tipoSelecionado, onSelectTipo, resultadosAnalise = {} }) {
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
      documentos: categoria.documentos
        .filter(doc => isDocumentoAplicavel(doc.tipo, hipotese))
        .map(doc => ({
          ...doc,
          obrigatorio: isDocumentoObrigatorio(doc.tipo, hipotese)
        }))
    })).filter(categoria => categoria.documentos.length > 0);
  }, [hipotese]);

  const getStatusIndicator = (tipo) => {
    const presente = !!documentosPorTipo[tipo];
    const resultado = resultadosAnalise[tipo];
    const obrigatorio = isDocumentoObrigatorio(tipo, hipotese);

    if (presente && resultado) {
      const score = resultado.score;
      if (score >= 70) return { color: 'bg-emerald-500', ring: 'ring-emerald-200' };
      if (score >= 40) return { color: 'bg-amber-500', ring: 'ring-amber-200' };
      return { color: 'bg-red-500', ring: 'ring-red-200' };
    }
    if (presente) return { color: 'bg-blue-500', ring: 'ring-blue-200' };
    if (obrigatorio) return { color: 'bg-red-300', ring: 'ring-red-100' };
    return { color: 'bg-slate-300', ring: 'ring-slate-100' };
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-2">
        {categoriasFiltradas.map(categoria => (
          <div key={categoria.id}>
            <div className="flex items-center gap-2 mb-2 px-2">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${categoria.gradiente}`} />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {categoria.nome}
              </span>
            </div>
            <div className="space-y-0.5">
              {categoria.documentos.map(doc => {
                const presente = documentosPorTipo[doc.tipo];
                const quantidade = presente ? presente.length : 0;
                const selecionado = tipoSelecionado === doc.tipo;
                const status = getStatusIndicator(doc.tipo);
                const resultado = resultadosAnalise[doc.tipo];

                return (
                  <button
                    key={doc.tipo}
                    onClick={() => onSelectTipo(doc.tipo)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                      selecionado
                        ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${status.color} ring-2 ${status.ring} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${selecionado ? 'font-semibold text-indigo-900' : 'font-medium text-slate-700'}`}>
                        {doc.nome}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {!presente && doc.obrigatorio && (
                          <span className="text-[10px] font-medium text-red-500">Faltando</span>
                        )}
                        {!presente && !doc.obrigatorio && (
                          <span className="text-[10px] text-slate-400">Opcional</span>
                        )}
                        {quantidade > 0 && (
                          <span className="text-[10px] text-slate-500">{quantidade} arquivo(s)</span>
                        )}
                        {resultado && (
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                            resultado.score >= 70 ? 'border-emerald-200 text-emerald-700' :
                            resultado.score >= 40 ? 'border-amber-200 text-amber-700' :
                            'border-red-200 text-red-700'
                          }`}>
                            {resultado.score}pts
                          </Badge>
                        )}
                      </div>
                    </div>
                    {selecionado && <ChevronRight className="h-4 w-4 text-indigo-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
