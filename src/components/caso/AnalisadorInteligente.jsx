import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Lightbulb,
  TrendingUp,
  FileSearch
} from 'lucide-react';

export default function AnalisadorInteligente({ caso, cliente, documentos, checklistItems }) {
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const analisarCasoCompleto = async () => {
    setAnalisando(true);
    try {
      // Preparar contexto do caso
      const contexto = {
        cliente: {
          razao_social: cliente?.razao_social,
          cnpj: cliente?.cnpj,
          modalidade_atual: cliente?.modalidade_habilitacao,
          optante_simples: cliente?.optante_simples_nacional
        },
        caso: {
          modalidade_pretendida: caso?.modalidade_pretendida,
          hipotese_revisao: caso?.hipotese_revisao,
          limite_pretendido: caso?.limite_pretendido,
          status: caso?.status
        },
        documentacao: {
          total_documentos: documentos.length,
          tipos_disponiveis: [...new Set(documentos.map(d => d.tipo_documento))],
          checklist_completude: `${checklistItems.filter(i => i.status === 'aprovado').length}/${checklistItems.length}`
        }
      };

      // Análise profunda com IA
      const prompt = `Você é um especialista em habilitação de operadores de comércio exterior (Radar RFB).

CASO:
${JSON.stringify(contexto, null, 2)}

ANÁLISE SOLICITADA:
1. CONFORMIDADE: O caso está apto para protocolo? Quais os gaps críticos?
2. RISCOS: Identifique potenciais riscos de indeferimento
3. OPORTUNIDADES: Há formas de fortalecer o pedido?
4. PRAZO: Estimativa realista de tempo até deferimento
5. RECOMENDAÇÕES: Top 3 ações prioritárias

RETORNE EM JSON:
{
  "classificacao_final": "APTO|INAPTO|PARCIALMENTE_APTO",
  "score_conformidade": 0-100,
  "gaps_criticos": [{"tipo": "", "descricao": "", "impacto": "alto|medio|baixo"}],
  "riscos_identificados": [{"descricao": "", "probabilidade": "alta|media|baixa", "mitigacao": ""}],
  "oportunidades": [{"descricao": "", "beneficio": ""}],
  "estimativa_prazo_dias": 0,
  "acoes_prioritarias": ["", "", ""],
  "observacoes_gerais": ""
}`;

      const analise = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            classificacao_final: { type: 'string' },
            score_conformidade: { type: 'number' },
            gaps_criticos: { type: 'array' },
            riscos_identificados: { type: 'array' },
            oportunidades: { type: 'array' },
            estimativa_prazo_dias: { type: 'number' },
            acoes_prioritarias: { type: 'array', items: { type: 'string' } },
            observacoes_gerais: { type: 'string' }
          }
        }
      });

      // Análise adicional: cruzamento automático de documentos
      const documentosChave = documentos.filter(d => 
        d.tipo_documento?.includes('balancete') || 
        d.tipo_documento?.includes('extrato') ||
        d.tipo_documento?.includes('contrato_social')
      );

      let analiseDocumentos = null;
      if (documentosChave.length >= 2) {
        const fileUrls = [];
        for (const doc of documentosChave.slice(0, 3)) {
          try {
            let url = doc.file_url;
            if (!url && doc.file_uri) {
              const signed = await base44.integrations.Core.CreateFileSignedUrl({
                file_uri: doc.file_uri,
                expires_in: 3600
              });
              url = signed.signed_url;
            }
            if (url) fileUrls.push(url);
          } catch (err) {
            console.warn('Erro ao obter URL:', err);
          }
        }

        if (fileUrls.length >= 2) {
          const promptDocs = `Analise CRUZAMENTO entre estes documentos:
          
Verifique:
- CNPJs consistentes?
- Datas compatíveis?
- Valores coerentes?
- Assinaturas e carimbos?

RETORNE EM JSON:
{
  "consistente": true/false,
  "inconsistencias": [{"tipo": "", "descricao": "", "severidade": "critica|media|leve"}],
  "pontos_fortes": [""],
  "recomendacoes": [""]
}`;

          analiseDocumentos = await base44.integrations.Core.InvokeLLM({
            prompt: promptDocs,
            file_urls: fileUrls,
            response_json_schema: {
              type: 'object',
              properties: {
                consistente: { type: 'boolean' },
                inconsistencias: { type: 'array' },
                pontos_fortes: { type: 'array', items: { type: 'string' } },
                recomendacoes: { type: 'array', items: { type: 'string' } }
              }
            }
          });
        }
      }

      setResultado({
        ...analise,
        analise_documentos: analiseDocumentos
      });

    } catch (error) {
      console.error('Erro na análise:', error);
      setResultado({
        erro: true,
        mensagem: error.message
      });
    } finally {
      setAnalisando(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Análise Inteligente Completa
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                IA analisa conformidade, riscos e recomendações
              </p>
            </div>
            <Button
              onClick={analisarCasoCompleto}
              disabled={analisando}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {analisando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <FileSearch className="h-4 w-4 mr-2" />
                  Analisar Caso
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {resultado && !resultado.erro && (
          <CardContent className="space-y-4">
            {/* Classificação e Score */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
              <div>
                <div className="text-sm text-slate-600 mb-1">Classificação</div>
                <div className="text-xl font-bold">
                  {resultado.classificacao_final === 'APTO' && (
                    <span className="text-green-600">✓ APTO PARA PROTOCOLO</span>
                  )}
                  {resultado.classificacao_final === 'INAPTO' && (
                    <span className="text-red-600">✗ INAPTO</span>
                  )}
                  {resultado.classificacao_final === 'PARCIALMENTE_APTO' && (
                    <span className="text-yellow-600">⚠ PARCIALMENTE APTO</span>
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {resultado.score_conformidade}
                </div>
                <div className="text-xs text-slate-500">Score</div>
              </div>
            </div>

            {/* Gaps Críticos */}
            {resultado.gaps_criticos?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Gaps Críticos ({resultado.gaps_criticos.length})
                </div>
                {resultado.gaps_criticos.map((gap, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      gap.impacto === 'alto'
                        ? 'bg-red-50 border-red-200'
                        : gap.impacto === 'medio'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 text-xs">
                        <Badge className={`mb-1 ${
                          gap.impacto === 'alto'
                            ? 'bg-red-100 text-red-800'
                            : gap.impacto === 'medio'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {gap.tipo}
                        </Badge>
                        <p className="text-slate-700">{gap.descricao}</p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {gap.impacto}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Riscos */}
            {resultado.riscos_identificados?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Riscos Identificados ({resultado.riscos_identificados.length})
                </div>
                {resultado.riscos_identificados.map((risco, idx) => (
                  <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">{risco.descricao}</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {risco.probabilidade}
                      </Badge>
                    </div>
                    {risco.mitigacao && (
                      <div className="flex items-start gap-1 mt-2 p-2 bg-white rounded">
                        <Lightbulb className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-600">{risco.mitigacao}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Oportunidades */}
            {resultado.oportunidades?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Oportunidades ({resultado.oportunidades.length})
                </div>
                {resultado.oportunidades.map((op, idx) => (
                  <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-slate-700">{op.descricao}</p>
                        {op.beneficio && (
                          <p className="text-green-700 font-medium mt-1">→ {op.beneficio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ações Prioritárias */}
            {resultado.acoes_prioritarias?.length > 0 && (
              <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <div className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Top 3 Ações Prioritárias
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700">
                  {resultado.acoes_prioritarias.map((acao, idx) => (
                    <li key={idx} className="leading-relaxed">{acao}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Estimativa de Prazo */}
            {resultado.estimativa_prazo_dias > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs">
                <span className="text-slate-700">Estimativa de prazo até deferimento:</span>
                <Badge className="bg-blue-100 text-blue-800">
                  ~{resultado.estimativa_prazo_dias} dias úteis
                </Badge>
              </div>
            )}

            {/* Análise de Documentos */}
            {resultado.analise_documentos && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-sm font-semibold text-slate-900 mb-2">
                  Análise Cruzada de Documentos
                </div>
                {resultado.analise_documentos.consistente ? (
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Documentos consistentes entre si
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resultado.analise_documentos.inconsistencias?.map((inc, idx) => (
                      <div key={idx} className="p-2 bg-red-50 rounded text-xs">
                        <Badge className="bg-red-100 text-red-800 mb-1">{inc.severidade}</Badge>
                        <p className="text-slate-700">{inc.descricao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Observações Gerais */}
            {resultado.observacoes_gerais && (
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 leading-relaxed">
                {resultado.observacoes_gerais}
              </div>
            )}
          </CardContent>
        )}

        {resultado?.erro && (
          <CardContent>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Erro na análise</p>
                <p>{resultado.mensagem}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}