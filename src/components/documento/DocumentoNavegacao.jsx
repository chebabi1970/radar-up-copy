import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function DocumentoNavegacao({
  documentos = [],
  documentoAtualId,
  documentoIndex,
  onNavegar
}) {
  const totalDocumentos = documentos.length;
  const posicaoAtual = documentoIndex + 1;
  const percentualProgresso = totalDocumentos > 0 ? (posicaoAtual / totalDocumentos) * 100 : 0;

  const handleProximo = () => {
    if (documentoIndex < totalDocumentos - 1) {
      onNavegar(documentos[documentoIndex + 1].id);
    }
  };

  const handleAnterior = () => {
    if (documentoIndex > 0) {
      onNavegar(documentos[documentoIndex - 1].id);
    }
  };

  return (
    <div className="bg-white border-t border-slate-200 px-6 py-4">
      <div className="flex items-center gap-4">
        {/* Botão Anterior */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAnterior}
          disabled={documentoIndex <= 0}
          className="flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>

        {/* Barra de Progresso */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Documento {posicaoAtual} de {totalDocumentos}
            </span>
            <span className="text-xs text-slate-500">
              {Math.round(percentualProgresso)}%
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 rounded-full"
              style={{ width: `${percentualProgresso}%` }}
            />
          </div>
        </div>

        {/* Botão Próximo */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleProximo}
          disabled={documentoIndex >= totalDocumentos - 1}
          className="flex-shrink-0"
        >
          Próximo
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Indicadores de Salto Rápido */}
      {totalDocumentos <= 10 && (
        <div className="flex gap-2 mt-4 flex-wrap">
          {documentos.map((doc, idx) => (
            <button
              key={doc.id}
              onClick={() => onNavegar(doc.id)}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition-all ${
                documentoAtualId === doc.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={doc.nome_arquivo}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}