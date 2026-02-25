import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitCompare,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  FileText,
  Minus,
  Plus,
  RefreshCw,
  Zap,
  ArrowLeftRight,
  Info
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

const severidadeConfig = {
  critica: { label: 'Crítica', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  alta: { label: 'Alta', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
  media: { label: 'Média', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  baixa: { label: 'Baixa', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  info: { label: 'Info', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' }
};

export default function ComparadorVersoes({ versoes, casoId, tipoDocumento }) {
  const [versaoA, setVersaoA] = useState(null);
  const [versaoB, setVersaoB] = useState(null);
  const [resultado, setResultado] = useState(null);

  // Filtrar apenas versões com arquivos
  const versoesDisponiveis = (versoes || []).filter(v => v.file_url || v.file_uri);

  const compararMutation = useMutation({
    mutationFn: async () => {
      if (!versaoA || !versaoB) {
        throw new Error('Selecione duas versões para comparar');
      }

      const docA = versoesDisponiveis.find(v => String(v.versao_numero) === String(versaoA));
      const docB = versoesDisponiveis.find(v => String(v.versao_numero) === String(versaoB));

      if (!docA || !docB) {
        throw new Error('Versão não encontrada');
      }

      // Obter URLs dos arquivos
      const getFileUrl = async (doc) => {
        if (doc.file_url) return doc.file_url;
        if (doc.file_uri) {
          if (doc.file_uri.startsWith('http')) return doc.file_uri;
          const result = await base44.integrations.Core.CreateFileSignedUrl({
            file_uri: doc.file_uri,
            expires_in: 3600
          });
          return result.signed_url;
        }
        return null;
      };

      const urlA = await getFileUrl(docA);
      const urlB = await getFileUrl(docB);

      const fileUrls = [urlA, urlB].filter(Boolean);

      const prompt = `Você é um auditor fiscal especializado. Compare detalhadamente as duas versões deste documento do tipo "${(tipoDocumento || 'documento').replace(/_/g, ' ')}".

VERSÃO ${docA.versao_numero} (${new Date(docA.created_date).toLocaleDateString('pt-BR')}):
- Arquivo: ${docA.nome_arquivo}
- Upload por: ${docA.usuario_upload || 'N/A'}
${docA.observacoes ? `- Observações: ${docA.observacoes}` : ''}
${docA.tags_versao?.length ? `- Tags: ${docA.tags_versao.join(', ')}` : ''}

VERSÃO ${docB.versao_numero} (${new Date(docB.created_date).toLocaleDateString('pt-BR')}):
- Arquivo: ${docB.nome_arquivo}
- Upload por: ${docB.usuario_upload || 'N/A'}
${docB.observacoes ? `- Observações: ${docB.observacoes}` : ''}
${docB.tags_versao?.length ? `- Tags: ${docB.tags_versao.join(', ')}` : ''}

Analise e retorne um JSON com a seguinte estrutura:
{
  "resumo_geral": "Uma frase resumindo a comparação",
  "conclusao": "mantida" | "melhorada" | "piorada" | "alterada",
  "score_versao_antiga": número de 0 a 100 (qualidade da versão mais antiga),
  "score_versao_nova": número de 0 a 100 (qualidade da versão mais nova),
  "diferencas": [
    {
      "campo": "nome do campo ou seção alterada",
      "tipo_mudanca": "adicionado" | "removido" | "modificado" | "mantido",
      "valor_anterior": "valor na versão A ou null",
      "valor_novo": "valor na versão B ou null",
      "severidade": "critica" | "alta" | "media" | "baixa" | "info",
      "impacto_fiscal": "explicação do impacto para a análise fiscal"
    }
  ],
  "alertas": [
    {
      "tipo": "inconsistencia" | "melhoria" | "regressao" | "atencao",
      "mensagem": "descrição do alerta",
      "severidade": "critica" | "alta" | "media" | "baixa"
    }
  ],
  "recomendacao": {
    "versao_preferida": número da versão recomendada,
    "justificativa": "razão pela preferência",
    "confianca": número de 0 a 100
  }
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls,
        response_json_schema: {
          type: 'object',
          properties: {
            resumo_geral: { type: 'string' },
            conclusao: { type: 'string' },
            score_versao_antiga: { type: 'number' },
            score_versao_nova: { type: 'number' },
            diferencas: { type: 'array' },
            alertas: { type: 'array' },
            recomendacao: { type: 'object' }
          }
        }
      });

      return { ...result, versaoANum: docA.versao_numero, versaoBNum: docB.versao_numero };
    },
    onSuccess: (data) => {
      setResultado(data);
    }
  });

  if (versoesDisponiveis.length < 2) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-6 text-center">
          <GitCompare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            Necessário pelo menos 2 versões com arquivo para comparar
          </p>
        </CardContent>
      </Card>
    );
  }

  const getMudancaIcon = (tipo) => {
    switch (tipo) {
      case 'adicionado': return <Plus className="h-3.5 w-3.5 text-green-600" />;
      case 'removido': return <Minus className="h-3.5 w-3.5 text-red-600" />;
      case 'modificado': return <RefreshCw className="h-3.5 w-3.5 text-amber-600" />;
      default: return <ArrowRight className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  const getMudancaBg = (tipo) => {
    switch (tipo) {
      case 'adicionado': return 'bg-green-50 border-green-200';
      case 'removido': return 'bg-red-50 border-red-200';
      case 'modificado': return 'bg-amber-50 border-amber-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  const getConclusaoBadge = (conclusao) => {
    switch (conclusao) {
      case 'melhorada': return <Badge className="bg-green-100 text-green-700">Melhorada</Badge>;
      case 'piorada': return <Badge className="bg-red-100 text-red-700">Piorada</Badge>;
      case 'mantida': return <Badge className="bg-blue-100 text-blue-700">Mantida</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-700">Alterada</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Seletor de versões */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Comparar Versões</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Versão A (anterior)</label>
              <Select value={versaoA || ''} onValueChange={setVersaoA}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar versão..." />
                </SelectTrigger>
                <SelectContent>
                  {versoesDisponiveis.map(v => (
                    <SelectItem
                      key={v.id}
                      value={String(v.versao_numero)}
                      disabled={String(v.versao_numero) === String(versaoB)}
                    >
                      v{v.versao_numero} - {v.nome_arquivo?.substring(0, 30)}
                      {v.status_versao === 'ativa' ? ' (ativa)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowLeftRight className="h-5 w-5 text-slate-400 flex-shrink-0 mt-4 sm:mt-5" />

            <div className="flex-1 w-full">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Versão B (nova)</label>
              <Select value={versaoB || ''} onValueChange={setVersaoB}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar versão..." />
                </SelectTrigger>
                <SelectContent>
                  {versoesDisponiveis.map(v => (
                    <SelectItem
                      key={v.id}
                      value={String(v.versao_numero)}
                      disabled={String(v.versao_numero) === String(versaoA)}
                    >
                      v{v.versao_numero} - {v.nome_arquivo?.substring(0, 30)}
                      {v.status_versao === 'ativa' ? ' (ativa)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => compararMutation.mutate()}
              disabled={!versaoA || !versaoB || compararMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 mt-4 sm:mt-5"
            >
              {compararMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Comparando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Comparar
                </>
              )}
            </Button>
          </div>

          {compararMutation.isError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{compararMutation.error?.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado da comparação */}
      {resultado && (
        <div className="space-y-4">
          {/* Resumo geral */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <GitCompare className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      v{resultado.versaoANum} vs v{resultado.versaoBNum}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {resultado.diferencas?.length || 0} diferenças encontradas
                    </p>
                  </div>
                </div>
                {getConclusaoBadge(resultado.conclusao)}
              </div>

              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                {resultado.resumo_geral}
              </p>

              {/* Scores comparativos */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 rounded-lg border bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">v{resultado.versaoANum}</span>
                    <span className="text-lg font-bold text-slate-900">{resultado.score_versao_antiga || 0}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="h-full rounded-full transition-all bg-slate-400"
                      style={{ width: `${resultado.score_versao_antiga || 0}%` }}
                    />
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-blue-600">v{resultado.versaoBNum}</span>
                    <span className="text-lg font-bold text-blue-700">{resultado.score_versao_nova || 0}</span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <div
                      className="h-full rounded-full transition-all bg-blue-500"
                      style={{ width: `${resultado.score_versao_nova || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diferenças detalhadas */}
          {resultado.diferencas?.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-amber-600" />
                  Diferenças Detalhadas ({resultado.diferencas.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {resultado.diferencas.map((diff, idx) => {
                  const sev = severidadeConfig[diff.severidade] || severidadeConfig.info;
                  return (
                    <div
                      key={idx}
                      className={`border rounded-lg p-3 ${getMudancaBg(diff.tipo_mudanca)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getMudancaIcon(diff.tipo_mudanca)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-slate-900">
                              {diff.campo}
                            </span>
                            <Badge className={`${sev.bg} ${sev.text} border ${sev.border} text-[10px]`}>
                              {sev.label}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {diff.tipo_mudanca}
                            </Badge>
                          </div>

                          {/* Valores comparados */}
                          {(diff.valor_anterior || diff.valor_novo) && (
                            <div className="flex flex-col sm:flex-row gap-2 mt-2">
                              {diff.valor_anterior && (
                                <div className="flex-1 p-2 bg-white/60 rounded border border-red-200/50">
                                  <p className="text-[10px] text-red-500 font-medium mb-0.5">Anterior (v{resultado.versaoANum})</p>
                                  <p className="text-xs text-slate-700 break-words">{diff.valor_anterior}</p>
                                </div>
                              )}
                              {diff.valor_novo && (
                                <div className="flex-1 p-2 bg-white/60 rounded border border-green-200/50">
                                  <p className="text-[10px] text-green-600 font-medium mb-0.5">Novo (v{resultado.versaoBNum})</p>
                                  <p className="text-xs text-slate-700 break-words">{diff.valor_novo}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Impacto fiscal */}
                          {diff.impacto_fiscal && (
                            <div className="mt-2 flex items-start gap-1.5">
                              <Info className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                              <p className="text-[10px] text-slate-500 italic">
                                {diff.impacto_fiscal}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Alertas */}
          {resultado.alertas?.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Alertas ({resultado.alertas.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {resultado.alertas.map((alerta, idx) => {
                  const sev = severidadeConfig[alerta.severidade] || severidadeConfig.info;
                  const tipoIcon = alerta.tipo === 'melhoria'
                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : alerta.tipo === 'regressao'
                    ? <AlertTriangle className="h-4 w-4 text-red-500" />
                    : <Info className="h-4 w-4 text-amber-500" />;

                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${sev.bg} ${sev.border}`}
                    >
                      {tipoIcon}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge className={`${sev.bg} ${sev.text} border ${sev.border} text-[10px]`}>
                            {sev.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {alerta.tipo}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-700">{alerta.mensagem}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Recomendação */}
          {resultado.recomendacao && (
            <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-1">
                      Recomendação: Usar versão v{resultado.recomendacao.versao_preferida}
                    </h4>
                    <p className="text-sm text-blue-700 mb-2">
                      {resultado.recomendacao.justificativa}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-600">Confiança:</span>
                      <div className="w-24 bg-blue-200 rounded-full h-2">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{ width: `${resultado.recomendacao.confianca || 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-blue-700">
                        {resultado.recomendacao.confianca || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
