import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Loader2, Zap, Eye, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import UploadNovaVersao from './UploadNovaVersao';

export default function VersionHistoricoPanel({ documentoId, casoId, cliente, onSelectVersion, onViewDoc }) {
  const [expandedVersions, setExpandedVersions] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [comparandoVersions, setComparandoVersions] = useState(false);
  const [sugestaoIA, setSugestaoIA] = useState(null);
  const queryClient = useQueryClient();

  // Buscar todas as versões do documento
  const { data: versoes = [], isLoading } = useQuery({
    queryKey: ['documentoVersions', documentoId],
    queryFn: async () => {
      const documento = await base44.entities.Documento.read(documentoId);
      const todasVersions = [documento];
      let documentoPai = documento;

      // Buscar todas as versões anteriores
      while (documentoPai.documento_pai_id) {
        const pai = await base44.entities.Documento.read(documentoPai.documento_pai_id);
        todasVersions.push(pai);
        documentoPai = pai;
      }

      // Buscar versões posteriores
      const documentsDoCase = await base44.entities.Documento.filter(
        { caso_id: casoId, tipo_documento: documento.tipo_documento },
        '-versao_numero',
        100
      );

      const todasVersoes = Array.from(new Map(
        documentsDoCase.map(d => [d.id, d])
      ).values()).sort((a, b) => b.versao_numero - a.versao_numero);

      return todasVersoes;
    }
  });

  const restaurarVersaoMutation = useMutation({
    mutationFn: async (versaoAnterior) => {
      const user = await base44.auth.me();

      // Criar nova versão a partir da versão anterior
      const arquivo = await fetch(versaoAnterior.file_url || 
        (await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: versaoAnterior.file_uri,
          expires_in: 3600
        })).signed_url
      ).then(r => r.blob());

      const uploadResult = await base44.integrations.Core.UploadFile({
        file: arquivo
      });

      const novaVersao = Math.max(...versoes.map(v => v.versao_numero || 1)) + 1;

      return await base44.entities.Documento.create({
        caso_id: casoId,
        tipo_documento: versaoAnterior.tipo_documento,
        nome_arquivo: `${versaoAnterior.nome_arquivo} (restaurado)`,
        file_url: uploadResult.file_url,
        data_documento: versaoAnterior.data_documento,
        versao_numero: novaVersao,
        documento_pai_id: versoes[0].id,
        status_versao: 'ativa',
        tags_versao: [...(versaoAnterior.tags_versao || []), 'restaurado'],
        usuario_upload: user.email,
        observacoes: `Restaurado de v${versaoAnterior.versao_numero}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentoVersions', documentoId] });
      queryClient.invalidateQueries({ queryKey: ['documentos', casoId] });
    }
  });

  const gerarSugestaoIAMutation = useMutation({
    mutationFn: async () => {
      setComparandoVersions(true);
      try {
        const versoesCom = versoes.filter(v => v.file_url || v.file_uri);
        
        if (versoesCom.length < 2) {
          throw new Error('Mínimo 2 versões necessárias para comparação');
        }

        // Obter URLs assinadas se necessário
        const urls = await Promise.all(
          versoesCom.map(async (v) => ({
            versao: v.versao_numero,
            url: v.file_url || (await base44.integrations.Core.CreateFileSignedUrl({
              file_uri: v.file_uri,
              expires_in: 3600
            })).signed_url
          }))
        );

        const prompt = `Você é um auditor especializado em documentação fiscal. Analize as ${versoesCom.length} versões deste documento (v${versoesCom.map(v => v.versao_numero).join(', ')}) e:

1. Identifique as principais diferenças entre as versões
2. Avalie qual versão é mais adequada para análise fiscal baseado em:
   - Completude e integridade dos dados
   - Data do documento
   - Clareza e legibilidade
   - Consistência com requisisitos da RFB

3. Forneça uma recomendação clara

Retorne como JSON estruturado:
{
  "comparacao": {
    "diferencas_principais": ["lista das principais diferenças"],
    "melhorias_identificadas": ["melhorias de uma versão para outra"]
  },
  "analise_versoes": [
    {
      "numero_versao": number,
      "qualidade_geral": "excelente"|"boa"|"satisfatoria"|"inadequada",
      "pontos_fortes": ["lista"],
      "pontos_fracos": ["lista"],
      "score_relevancia": number
    }
  ],
  "recomendacao": {
    "versao_recomendada": number,
    "justificativa": "explicação detalhada",
    "confianca": number
  }
}`;

        const resultado = await base44.integrations.Core.InvokeLLM({
          prompt: prompt,
          file_urls: urls.map(u => u.url),
          response_json_schema: {
            type: 'object',
            properties: {
              comparacao: { type: 'object' },
              analise_versoes: { type: 'array' },
              recomendacao: { type: 'object' }
            }
          }
        });

        setSugestaoIA(resultado);
        return resultado;
      } finally {
        setComparandoVersions(false);
      }
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Histórico de Versões</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle>Histórico de Versões ({versoes.length})</CardTitle>
          <Button
            size="sm"
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Versão
          </Button>
        </CardHeader>

        <CardContent className="pt-6 space-y-3">
          {/* Sugestão da IA */}
          {sugestaoIA && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-600" />
                <h4 className="font-semibold text-amber-900">Análise de IA - Versão Recomendada</h4>
              </div>

              {/* Recomendação */}
              <div className="bg-white/70 rounded p-3 border border-amber-200">
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  Versão Recomendada: v{sugestaoIA.recomendacao.versao_recomendada}
                </p>
                <p className="text-xs text-slate-700 mb-2">
                  Confiança: {Math.round(sugestaoIA.recomendacao.confianca * 100)}%
                </p>
                <p className="text-xs text-slate-600 italic">
                  {sugestaoIA.recomendacao.justificativa}
                </p>
              </div>

              {/* Análise por Versão */}
              {sugestaoIA.analise_versoes && (
                <div className="grid gap-2">
                  {sugestaoIA.analise_versoes.map((analise) => (
                    <div key={analise.numero_versao} className="bg-white/50 rounded p-2 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900">v{analise.numero_versao}</span>
                        <Badge className={
                          analise.qualidade_geral === 'excelente' ? 'bg-green-100 text-green-800' :
                          analise.qualidade_geral === 'boa' ? 'bg-blue-100 text-blue-800' :
                          analise.qualidade_geral === 'satisfatoria' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {analise.qualidade_geral}
                        </Badge>
                      </div>
                      <p className="text-slate-600">Score: {Math.round(analise.score_relevancia * 100)}</p>
                    </div>
                  ))}
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSugestaoIA(null)}
                className="w-full text-xs"
              >
                Fechar Análise
              </Button>
            </div>
          )}

          {/* Lista de Versões */}
          {versoes.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-6">Nenhuma versão encontrada</p>
          ) : (
            <div className="space-y-2">
              {versoes.map((versao) => {
                const isExpanded = expandedVersions[versao.id];
                const isAtiva = versao.status_versao === 'ativa';

                return (
                  <div
                    key={versao.id}
                    className={`border rounded-lg transition-colors ${
                      isAtiva ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {/* Header */}
                    <button
                      onClick={() => setExpandedVersions({
                        ...expandedVersions,
                        [versao.id]: !isExpanded
                      })}
                      className="w-full p-3 flex items-center justify-between hover:bg-black/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 text-left flex-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={
                              isAtiva 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-slate-100 text-slate-800'
                            }>
                              v{versao.versao_numero}
                            </Badge>
                            {isAtiva && (
                              <Badge className="bg-blue-100 text-blue-800">ATIVA</Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-900 mt-1">
                            {versao.nome_arquivo}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {new Date(versao.created_date).toLocaleDateString('pt-BR')} por {versao.usuario_upload || 'usuário'}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    {/* Expandido */}
                    {isExpanded && (
                      <div className="border-t p-3 space-y-3">
                        {versao.tags_versao && versao.tags_versao.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {versao.tags_versao.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {versao.resumo_alteracoes && (
                          <div className="bg-white/50 rounded p-2">
                            <p className="text-xs font-semibold text-slate-900 mb-1">Alterações:</p>
                            <p className="text-xs text-slate-600">{versao.resumo_alteracoes}</p>
                          </div>
                        )}

                        {versao.observacoes && (
                          <div className="bg-white/50 rounded p-2">
                            <p className="text-xs font-semibold text-slate-900 mb-1">Observações:</p>
                            <p className="text-xs text-slate-600">{versao.observacoes}</p>
                          </div>
                        )}

                        {/* Ações */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewDoc?.(versao)}
                            className="flex-1 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Visualizar
                          </Button>

                          {!isAtiva && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => restaurarVersaoMutation.mutate(versao)}
                              disabled={restaurarVersaoMutation.isPending}
                              className="flex-1 text-xs"
                            >
                              {restaurarVersaoMutation.isPending ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : null}
                              Restaurar
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Botão de Análise com IA */}
          {versoes.length >= 2 && (
            <Button
              onClick={() => gerarSugestaoIAMutation.mutate()}
              disabled={gerarSugestaoIAMutation.isPending || comparandoVersions}
              className="w-full mt-4 bg-amber-600 hover:bg-amber-700"
            >
              {comparandoVersions ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando versões...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Análise de IA - Versão Recomendada
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Modal de Nova Versão */}
      {showUploadModal && (
        <UploadNovaVersao
          documentoAtual={versoes[0]}
          casoId={casoId}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['documentoVersions', documentoId] });
          }}
        />
      )}
    </>
  );
}