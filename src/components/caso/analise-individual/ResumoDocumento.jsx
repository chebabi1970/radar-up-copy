import React from 'react';
import { getPeriodoDocumento } from '@/config/documentosPorHipotese';
import { tipoDocumentoLabels, statusAnaliseConfig } from '@/config/documentoLabels';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Clock, Tag } from 'lucide-react';

export default function ResumoDocumento({ documento, tipoDocumento, hipotese }) {
  if (!documento) {
    return (
      <Card className="rounded-2xl border-slate-100">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mx-auto mb-3">
            <FileText className="h-7 w-7 text-slate-300" />
          </div>
          <p className="font-medium text-slate-700">Documento não enviado</p>
          <p className="text-sm text-slate-500 mt-1">
            Envie o documento na aba "Documentos" para poder analisá-lo aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = statusAnaliseConfig[documento.status_analise] || statusAnaliseConfig.pendente;
  const StatusIcon = statusConfig.icon;
  const periodo = getPeriodoDocumento(tipoDocumento, hipotese);
  const dados = documento.dados_extraidos || {};
  const dadosKeys = Object.keys(dados).filter(k => dados[k] !== null && dados[k] !== undefined);

  const formatValue = (value) => {
    if (typeof value === 'number') {
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatKey = (key) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <Card className="rounded-2xl border-slate-100">
      <CardContent className="p-5 space-y-4">
        {/* Metadata */}
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Informações do Documento</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5">
              <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Arquivo</p>
                <p className="text-sm font-medium text-slate-900 break-all">{documento.nome_arquivo}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Tag className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Tipo</p>
                <p className="text-sm font-medium text-slate-900">{tipoDocumentoLabels[tipoDocumento] || tipoDocumento}</p>
              </div>
            </div>
            {documento.data_documento && (
              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Data do Documento</p>
                  <p className="text-sm font-medium text-slate-900">{documento.data_documento}</p>
                </div>
              </div>
            )}
            {documento.periodo_referencia && (
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Período de Referência</p>
                  <p className="text-sm font-medium text-slate-900">{documento.periodo_referencia}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${statusConfig.bg} border ${statusConfig.border}`}>
              <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
              <span className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
            </div>
            {periodo && (
              <Badge variant="outline" className="text-xs border-slate-200">
                {periodo}
              </Badge>
            )}
            {documento.versao_numero > 1 && (
              <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
                v{documento.versao_numero}
              </Badge>
            )}
          </div>
        </div>

        {/* Extracted Data */}
        {dadosKeys.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Dados Extraídos</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dadosKeys.map(key => (
                <div key={key} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{formatKey(key)}</p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5 break-words">{formatValue(dados[key])}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observations */}
        {documento.observacoes && (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-1">Observações</h4>
            <p className="text-sm text-slate-600">{documento.observacoes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
