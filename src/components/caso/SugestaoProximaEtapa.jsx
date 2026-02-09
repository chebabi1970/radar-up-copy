import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SugestaoProximaEtapa({ casoId, casoData, workflow }) {
  const [sugestao, setSugestao] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  const gerarSugestao = async () => {
    setCarregando(true);
    setErro(null);
    setSugestao(null);

    try {
      // Buscar documentos analisados
      const allDocumentos = await base44.entities.Documento.list();
      const documentosCaso = allDocumentos.filter(d => d.caso_id === casoId);

      // Buscar tarefas
      const allTarefas = await base44.entities.CasoTarefa.list();
      const tarefasCaso = allTarefas.filter(t => t.caso_id === casoId);

      // Buscar análises
      const allAnalises = await base44.entities.AnaliseHistorico.list();
      const analisesCaso = allAnalises.filter(a => a.caso_id === casoId);

      const etapaAtual = workflow.etapas.find(e => e.id === workflow.etapa_atual_id);
      const proximaEtapa = workflow.etapas.find(e => 
        workflow.etapas.indexOf(e) === workflow.etapas.indexOf(etapaAtual) + 1
      );

      const resposta = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é especialista em fluxos de conformidade RFB com expertise em detecção de progresso e identificação de próximas etapas ideais.

**CASO**: ${casoData?.numero_caso || 'Novo Caso'}
**CLIENTE**: ${casoData?.cliente_id || 'N/A'}

**WORKFLOW ATUAL**:
${JSON.stringify({
  etapas_totais: workflow.etapas.length,
  progresso: workflow.progresso_percentual,
  etapa_atual: etapaAtual,
  proxima_etapa_prevista: proximaEtapa
}, null, 2)}

**DOCUMENTOS DO CASO** (${documentosCaso.length}):
${documentosCaso.map(d => ({
  tipo: d.tipo_documento,
  status: d.status_analise,
  data: d.data_documento,
  dados: d.dados_extraidos ? 'Sim' : 'Não'
})).slice(0, 10).map(d => `- ${d.tipo} (${d.status})`).join('\n')}

**TAREFAS PENDENTES** (${tarefasCaso.filter(t => t.status !== 'concluida').length}):
${tarefasCaso.filter(t => t.status !== 'concluida').slice(0, 5).map(t => 
`- ${t.titulo} (${t.prioridade}) - Vence em ${t.data_vencimento}`
).join('\n')}

**ANÁLISES REALIZADAS**: ${analisesCaso.length}
Última análise: ${analisesCaso[analisesCaso.length - 1]?.data_hora_analise || 'Nenhuma'}

**TAREFA**: Analisar o status atual do caso e sugerir a próxima etapa ideal com base em:
1. Completude da etapa atual (documentos necessários presentes?)
2. Status dos documentos (algum com erro ou revisão necessária?)
3. Tarefas pendentes que bloqueiam o progresso
4. Padrão histórico de fluxos similares
5. Documentação disponível para próxima etapa

**RETORNE UM JSON ESTRUTURADO**:
{
  "etapa_atual": "nome da etapa",
  "status_etapa_atual": "completa|incompleta|em_risco",
  "itens_bloqueadores": ["item 1 que impede progresso", "item 2"],
  "documentos_faltantes": ["tipo 1", "tipo 2"],
  "proxima_etapa_sugerida": "nome da próxima etapa",
  "por_que_proxima_etapa": "explicação detalhada",
  "recomendacoes": [
    "recomendação 1 para completar etapa atual",
    "recomendação 2"
  ],
  "urgencia": "baixa|media|alta|critica",
  "tempo_estimado_proxima_etapa": "número de dias",
  "risco_atraso": false,
  "observacoes": "observações importantes"
}`,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            etapa_atual: { type: 'string' },
            status_etapa_atual: { type: 'string' },
            itens_bloqueadores: { type: 'array', items: { type: 'string' } },
            documentos_faltantes: { type: 'array', items: { type: 'string' } },
            proxima_etapa_sugerida: { type: 'string' },
            por_que_proxima_etapa: { type: 'string' },
            recomendacoes: { type: 'array', items: { type: 'string' } },
            urgencia: { type: 'string' },
            tempo_estimado_proxima_etapa: { type: 'string' },
            risco_atraso: { type: 'boolean' },
            observacoes: { type: 'string' }
          }
        }
      });

      setSugestao(resposta);
    } catch (err) {
      console.error('Erro ao gerar sugestão:', err);
      setErro('Erro ao gerar sugestão. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const urgenciaColors = {
    baixa: 'bg-green-50 border-green-200',
    media: 'bg-yellow-50 border-yellow-200',
    alta: 'bg-orange-50 border-orange-200',
    critica: 'bg-red-50 border-red-200'
  };

  if (!sugestao && !carregando && !erro) {
    return (
      <Button 
        onClick={gerarSugestao}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
      >
        <Zap className="h-4 w-4 mr-2" />
        Gerar Sugestão de Próxima Etapa (IA)
      </Button>
    );
  }

  if (carregando) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-sm text-slate-600">Analisando caso e sugerindo próxima etapa...</p>
        </CardContent>
      </Card>
    );
  }

  if (erro) {
    return (
      <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
        <CardContent className="p-4">
          <p className="text-sm text-red-700">{erro}</p>
          <Button 
            onClick={gerarSugestao}
            variant="outline"
            className="mt-3 w-full"
          >
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status da Etapa Atual */}
      <Card className={`border-0 shadow-sm border-l-4 ${
        sugestao.status_etapa_atual === 'completa' ? 'border-l-green-500 bg-green-50' :
        sugestao.status_etapa_atual === 'incompleta' ? 'border-l-yellow-500 bg-yellow-50' :
        'border-l-red-500 bg-red-50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {sugestao.status_etapa_atual === 'completa' && 
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            }
            {sugestao.status_etapa_atual === 'incompleta' && 
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            }
            {sugestao.status_etapa_atual === 'em_risco' && 
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Etapa Atual: {sugestao.etapa_atual}</p>
              <p className="text-sm text-slate-700 mt-1 capitalize">
                Status: <span className="font-medium">{sugestao.status_etapa_atual}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloqueadores */}
      {sugestao.itens_bloqueadores?.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="font-semibold text-red-900 mb-2">⚠️ Itens Bloqueadores:</p>
            <ul className="space-y-1">
              {sugestao.itens_bloqueadores.map((item, idx) => (
                <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Documentos Faltantes */}
      {sugestao.documentos_faltantes?.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <p className="font-semibold text-orange-900 mb-2">📄 Documentos Faltantes:</p>
            <ul className="space-y-1">
              {sugestao.documentos_faltantes.map((doc, idx) => (
                <li key={idx} className="text-sm text-orange-800">• {doc}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Próxima Etapa Sugerida */}
      <Card className={`border-0 shadow-sm border-l-4 border-l-blue-500 ${urgenciaColors[sugestao.urgencia]}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-600 font-semibold mb-1">Próxima Etapa Sugerida</p>
              <p className="text-lg font-bold text-slate-900">{sugestao.proxima_etapa_sugerida}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600">Urgência</p>
              <p className="text-sm font-bold capitalize">{sugestao.urgencia}</p>
            </div>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{sugestao.por_que_proxima_etapa}</p>
          {sugestao.tempo_estimado_proxima_etapa && (
            <p className="text-xs text-slate-600 mt-2">
              ⏱️ Tempo estimado: {sugestao.tempo_estimado_proxima_etapa}
            </p>
          )}
          {sugestao.risco_atraso && (
            <p className="text-xs text-red-700 font-medium mt-2">⚠️ Risco de atraso identificado</p>
          )}
        </CardContent>
      </Card>

      {/* Recomendações */}
      {sugestao.recomendacoes?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="font-semibold text-slate-900 mb-3">💡 Recomendações para Progresso:</p>
            <ol className="space-y-2">
              {sugestao.recomendacoes.map((rec, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-slate-700">
                  <span className="font-bold text-blue-600 flex-shrink-0">{idx + 1}.</span>
                  {rec}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {sugestao.observacoes && (
        <Card className="border-0 shadow-sm bg-slate-50">
          <CardContent className="p-4">
            <p className="text-sm text-slate-700">{sugestao.observacoes}</p>
          </CardContent>
        </Card>
      )}

      <Button 
        onClick={gerarSugestao}
        variant="outline"
        className="w-full"
      >
        Regenerar Sugestão
      </Button>
    </div>
  );
}