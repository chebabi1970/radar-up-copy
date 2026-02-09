import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Link2,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AnaliseCruzadaProativa({ clienteId, clienteData }) {
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [detalhesModal, setDetalhesModal] = useState(false);
  const queryClient = useQueryClient();

  // Buscar todos os casos do cliente
  const { data: casos, isLoading: casosLoading } = useQuery({
    queryKey: ['casos-cliente', clienteId],
    queryFn: async () => {
      const allCasos = await base44.entities.Caso.list();
      return allCasos.filter(c => c.cliente_id === clienteId).sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
    }
  });

  // Buscar todos os documentos dos casos do cliente
  const { data: documentosPorCaso, isLoading: docsLoading } = useQuery({
    queryKey: ['documentos-cliente', clienteId],
    queryFn: async () => {
      if (!casos || casos.length === 0) return {};
      
      const allDocs = await base44.entities.Documento.list();
      const docsPorCaso = {};
      
      casos.forEach(caso => {
        docsPorCaso[caso.id] = allDocs.filter(d => d.caso_id === caso.id);
      });
      
      return docsPorCaso;
    },
    enabled: !!casos && casos.length > 0
  });

  const analisarCruzado = async () => {
    if (!casos || casos.length < 2) {
      alert('Necessário ter pelo menos 2 casos para análise cruzada');
      return;
    }

    setAnalisando(true);
    setResultado(null);

    try {
      const user = await base44.auth.me();

      // Preparar dados históricos de todos os casos
      const dadosCasos = casos.map(caso => ({
        numero: caso.numero_caso,
        id: caso.id,
        status: caso.status,
        hipotese: caso.hipotese_revisao,
        modalidade_pretendida: caso.modalidade_pretendida,
        limite_pretendido: caso.limite_pretendido,
        estimativa_calculada: caso.estimativa_calculada,
        saldos_bancarios: caso.saldos_bancarios,
        aplicacoes_financeiras: caso.aplicacoes_financeiras,
        data_protocolo: caso.data_protocolo,
        observacoes: caso.observacoes
      }));

      // Preparar resumo de documentos por tipo
      const resumoDocumentos = {};
      casos.forEach(caso => {
        const docs = documentosPorCaso?.[caso.id] || [];
        docs.forEach(doc => {
          if (!resumoDocumentos[doc.tipo_documento]) {
            resumoDocumentos[doc.tipo_documento] = [];
          }
          resumoDocumentos[doc.tipo_documento].push({
            caso: caso.numero_caso,
            data: doc.data_documento,
            status: doc.status_analise
          });
        });
      });

      // Chamar IA para análise cruzada proativa
      const analise = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é analista sênior de conformidade RFB com expertise em detecção de padrões de risco e inconsistências históricas.

**CLIENTE**: ${clienteData?.razao_social} (CNPJ: ${clienteData?.cnpj})

**HISTÓRICO DE CASOS** (${casos.length} casos):
${JSON.stringify(dadosCasos, null, 2)}

**RESUMO DE DOCUMENTOS HISTÓRICOS**:
${JSON.stringify(resumoDocumentos, null, 2)}

**ANÁLISE CRUZADA PROATIVA - BUSCAR PADRÕES E RISCOS**:

1. **PADRÕES FINANCEIROS**:
   - Evolução dos saldos bancários entre casos
   - Variações anormais de período para período
   - Crescimento/redução suspeita
   - Valores "redondos" ou padrões circulares

2. **COMPORTAMENTO DOCUMENTAL**:
   - Documentos que aparecem/desaparecem entre casos
   - Atrasos consistentes na documentação
   - Documentos frequentemente rejeitados

3. **PADRÕES DE HIPÓTESES LEGAIS**:
   - Se cliente muda de hipótese, analisar motivo
   - Padrão de rejeição/aprovação por hipótese
   - Consistência entre casos

4. **RISCOS HISTÓRICOS ACUMULADOS**:
   - Inconsistências que se repetem
   - Documentação fraca em temas específicos
   - Indícios de fraude ou simulação

5. **ALERTAS PROATIVOS**:
   - O que melhorar no próximo caso
   - Quais documentos carecem de atenção especial
   - Padrões suspeitos que podem resultar em indeferimento

**RETORNE OBRIGATORIAMENTE UM JSON ESTRUTURADO**:
{
  "resumo_historico": "resumo do histórico do cliente em 2-3 frases",
  "padroes_financeiros": [
    {
      "descricao": "padrão identificado",
      "casos_envolvidos": ["número caso"],
      "risco": "alto|medio|baixo",
      "observacao": "detalhes"
    }
  ],
  "comportamento_documental": [
    {
      "tipo_documento": "tipo",
      "padroes": "padrão observado",
      "frequencia": "sempre|frequente|ocasional",
      "recomendacao": "o que fazer"
    }
  ],
  "inconsistencias_historicas": [
    {
      "descricao": "inconsistência",
      "casos": ["caso1", "caso2"],
      "severidade": "critica|media|leve",
      "impacto_potencial": "explicação"
    }
  ],
  "sugestoes_comparativas": [
    {
      "caso1": "número caso 1",
      "caso2": "número caso 2",
      "tipo_analise": "tipo de comparação sugerida",
      "prioridade": "alta|media|baixa",
      "justificativa": "por que comparar"
    }
  ],
  "alertas_proativos": [
    {
      "alerta": "alerta específico",
      "baseado_em": "qual padrão/caso",
      "recomendacao": "ação recomendada",
      "prazo": "urgente|curto|medio"
    }
  ],
  "risco_global_cliente": "baixo|medio|alto",
  "justificativa_risco": "explicação do risco",
  "oportunidades_melhoria": ["oportunidade 1", "oportunidade 2"],
  "conclusao": "análise conclusiva com recomendações"
}`,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            resumo_historico: { type: 'string' },
            padroes_financeiros: { type: 'array', items: { type: 'object' } },
            comportamento_documental: { type: 'array', items: { type: 'object' } },
            inconsistencias_historicas: { type: 'array', items: { type: 'object' } },
            sugestoes_comparativas: { type: 'array', items: { type: 'object' } },
            alertas_proativos: { type: 'array', items: { type: 'object' } },
            risco_global_cliente: { type: 'string' },
            justificativa_risco: { type: 'string' },
            oportunidades_melhoria: { type: 'array', items: { type: 'string' } },
            conclusao: { type: 'string' }
          }
        }
      });

      setResultado(analise);
    } catch (error) {
      console.error('Erro na análise cruzada:', error);
      alert('Erro ao realizar análise cruzada. Tente novamente.');
    } finally {
      setAnalisando(false);
    }
  };

  const isLoading = casosLoading || docsLoading;
  const temCasos = casos && casos.length >= 2;

  const riscoColors = {
    baixo: 'text-green-600 bg-green-50',
    medio: 'text-yellow-600 bg-yellow-50',
    alto: 'text-red-600 bg-red-50'
  };

  const severidadeColors = {
    critica: 'bg-red-50 border-red-200',
    media: 'bg-yellow-50 border-yellow-200',
    leve: 'bg-blue-50 border-blue-200'
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-sm text-slate-600">Carregando dados...</p>
        </CardContent>
      </Card>
    );
  }

  if (!temCasos) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-600">Necessário pelo menos 2 casos para análise cruzada</p>
        </CardContent>
      </Card>
    );
  }

  if (analisando) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-sm text-slate-600 font-medium">Analisando {casos.length} casos do cliente...</p>
          <p className="text-xs text-slate-500 mt-1">Detectando padrões e riscos históricos</p>
        </CardContent>
      </Card>
    );
  }

  if (!resultado) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Link2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Análise Cruzada Proativa</h3>
              <p className="text-sm text-slate-600 mt-1">
                Detecte padrões e riscos comparando {casos.length} caso{casos.length !== 1 ? 's' : ''} do cliente
              </p>
            </div>
            <Button
              onClick={analisarCruzado}
              className="bg-blue-600 hover:bg-blue-700 w-full"
            >
              Iniciar Análise Cruzada
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo Histórico */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Resumo Histórico</p>
          <p className="text-sm text-slate-700">{resultado.resumo_historico}</p>
        </CardContent>
      </Card>

      {/* Risco Global */}
      <Card className={`border-0 shadow-sm ${riscoColors[resultado.risco_global_cliente]}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase mb-1">Risco Global do Cliente</p>
              <p className="text-2xl font-bold capitalize mb-1">{resultado.risco_global_cliente}</p>
              <p className="text-xs opacity-80 leading-relaxed">{resultado.justificativa_risco}</p>
            </div>
            {resultado.risco_global_cliente === 'alto' && <AlertTriangle className="h-6 w-6 flex-shrink-0" />}
            {resultado.risco_global_cliente === 'medio' && <AlertCircle className="h-6 w-6 flex-shrink-0" />}
            {resultado.risco_global_cliente === 'baixo' && <CheckCircle2 className="h-6 w-6 flex-shrink-0" />}
          </div>
        </CardContent>
      </Card>

      {/* Padrões Financeiros */}
      {resultado.padroes_financeiros?.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Padrões Financeiros Detectados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resultado.padroes_financeiros.map((padrao, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-purple-200 bg-purple-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-purple-900">{padrao.descricao}</p>
                    <p className="text-xs text-purple-700 mt-1">{padrao.observacao}</p>
                    {padrao.casos_envolvidos?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {padrao.casos_envolvidos.map((caso, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {caso}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge className="text-xs flex-shrink-0 ml-2" variant={padrao.risco === 'alto' ? 'destructive' : 'outline'}>
                    {padrao.risco}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Inconsistências Históricas */}
      {resultado.inconsistencias_historicas?.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Inconsistências Históricas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resultado.inconsistencias_historicas.map((incon, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${severidadeColors[incon.severidade]}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-900">{incon.descricao}</p>
                    <p className="text-xs text-slate-600 mt-1">Impacto: {incon.impacto_potencial}</p>
                    {incon.casos?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {incon.casos.map((caso, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {caso}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sugestões Comparativas */}
      {resultado.sugestoes_comparativas?.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Comparações Sugeridas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resultado.sugestoes_comparativas.map((sugest, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-blue-900">
                      {sugest.caso1} ↔ {sugest.caso2}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">{sugest.tipo_analise}</p>
                    <p className="text-xs text-blue-600 mt-1">{sugest.justificativa}</p>
                  </div>
                  <Badge className="text-xs flex-shrink-0">
                    {sugest.prioridade}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Alertas Proativos */}
      {resultado.alertas_proativos?.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Alertas Proativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resultado.alertas_proativos.map((alerta, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-orange-200 bg-orange-50">
                <p className="font-medium text-sm text-orange-900">{alerta.alerta}</p>
                <p className="text-xs text-orange-700 mt-1">
                  <span className="font-semibold">Recomendação:</span> {alerta.recomendacao}
                </p>
                <Badge className="mt-2 text-xs bg-orange-100 text-orange-800">
                  {alerta.prazo}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Oportunidades de Melhoria */}
      {resultado.oportunidades_melhoria?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Oportunidades de Melhoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resultado.oportunidades_melhoria.map((oport, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-green-200 bg-green-50 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-800">{oport}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Conclusão */}
      <Card className="border-0 shadow-sm bg-slate-50">
        <CardContent className="p-4">
          <p className="text-sm text-slate-700 font-medium mb-2">Conclusão e Recomendações</p>
          <p className="text-sm text-slate-600 leading-relaxed">{resultado.conclusao}</p>
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => setResultado(null)}
          variant="outline"
          className="flex-1"
        >
          Nova Análise
        </Button>
        <Button
          onClick={() => setDetalhesModal(true)}
          variant="outline"
          className="flex-1"
        >
          Ver JSON Completo
        </Button>
      </div>

      {/* Modal de detalhes */}
      <Dialog open={detalhesModal} onOpenChange={setDetalhesModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dados Completos da Análise Cruzada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <pre className="bg-slate-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}