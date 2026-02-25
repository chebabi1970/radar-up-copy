import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  Building2,
  DollarSign,
  TrendingUp,
  FileText,
  Save,
  Loader2,
  Sparkles,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  ShieldCheck
} from 'lucide-react';

const hipoteseLabels = {
  recursos_financeiros_livres: "I - Recursos Financeiros de Livre Movimentação",
  recolhimento_tributos_das: "III - Recolhimento Tributos - DAS (Simples Nacional)",
  recolhimento_tributos_cprb: "IV - Recolhimento CPRB",
  retomada_atividades: "V - Retomada de Atividades"
};

const modalidadeInfo = {
  limitada: {
    label: "Limitada",
    cor: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    descricao: "Até USD 150.000.000 por operação"
  },
  ilimitada: {
    label: "Ilimitada",
    cor: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    descricao: "Sem limite por operação"
  }
};

export default function AnaliseTab({ caso, cliente, documentos }) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [observacoesAnalise, setObservacoesAnalise] = useState(caso.observacoes || '');
  const [saldosBancarios, setSaldosBancarios] = useState(caso.saldos_bancarios || 0);
  const [aplicacoesFinanceiras, setAplicacoesFinanceiras] = useState(caso.aplicacoes_financeiras || 0);
  const [numeroProcessoEcac, setNumeroProcessoEcac] = useState(caso.numero_processo_ecac || '');
  const [dataProtocoloEcac, setDataProtocoloEcac] = useState(caso.data_protocolo_ecac || '');

  const queryClient = useQueryClient();

  const calcularCapacidadeAutomatica = () => {
    const totalRecursos = saldosBancarios + aplicacoesFinanceiras;
    const taxaDolar = 5.3076;
    return totalRecursos / taxaDolar;
  };

  const updateCasoMutation = useMutation({
    mutationFn: (data) => base44.entities.Caso.update(caso.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caso', caso.id] });
    }
  });

  const salvarDadosFinanceiros = async () => {
    const capacidadeCalculada = calcularCapacidadeAutomatica();
    await updateCasoMutation.mutateAsync({
      saldos_bancarios: saldosBancarios,
      aplicacoes_financeiras: aplicacoesFinanceiras,
      numero_processo_ecac: numeroProcessoEcac,
      data_protocolo_ecac: dataProtocoloEcac,
      estimativa_calculada: capacidadeCalculada
    });
  };

  const calcularEstimativa = async () => {
    setIsCalculating(true);

    try {
      const capacidadeAutomatica = calcularCapacidadeAutomatica();

      const prompt = `Como especialista em comércio exterior brasileiro e na legislação RADAR, analise este caso de revisão de estimativa conforme IN 1984/2020 e Portaria Coana 72/2020.

DADOS DO CLIENTE:
- Razão Social: ${cliente?.razao_social}
- CNPJ: ${cliente?.cnpj}
- Modalidade Atual: ${cliente?.modalidade_habilitacao || 'Não informada'}
- Limite Atual: ${cliente?.limite_atual ? `USD ${cliente.limite_atual.toLocaleString()}` : 'Não informado'}

DADOS DO CASO:
- Hipótese de Revisão: ${hipoteseLabels[caso.hipotese_revisao]}
- Saldos Bancários: R$ ${saldosBancarios.toLocaleString('pt-BR')}
- Aplicações Financeiras: R$ ${aplicacoesFinanceiras.toLocaleString('pt-BR')}
- Capacidade Calculada: USD ${capacidadeAutomatica.toLocaleString('en-US', {maximumFractionDigits: 2})}

DOCUMENTOS DISPONÍVEIS:
${documentos.map(d => `- ${d.nome_arquivo} (${d.tipo_documento})`).join('\n')}

Com base no Livro RADAR 2025 e na legislação vigente, forneça:
1. Validação da estimativa calculada conforme Art. 6º Portaria Coana 72
2. Modalidade de habilitação apropriada
3. Análise de risco da documentação apresentada
4. Recomendações sobre documentação adicional necessária
5. Alertas sobre possíveis inconsistências

Taxa de câmbio: R$ 5,3076 (válida até 31/12/2026)

Justifique sua análise citando os artigos relevantes da IN 1984/2020 e Portaria Coana 72/2020.`;

      const schema = {
        type: "object",
        properties: {
          estimativa_validada: { type: "number", description: "Estimativa em USD" },
          modalidade_sugerida: { type: "string", enum: ["limitada", "ilimitada"] },
          limite_sugerido: { type: "number" },
          justificativa_legal: { type: "string", description: "Justificativa com base legal" },
          documentos_pendentes: { type: "string", description: "Documentos que ainda precisam ser enviados" },
          alertas: { type: "string", description: "Pontos de atenção identificados" },
          nivel_risco: { type: "string", enum: ["baixo", "medio", "alto"] }
        }
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema
      });

      await updateCasoMutation.mutateAsync({
        estimativa_calculada: result.estimativa_validada,
        modalidade_pretendida: result.modalidade_sugerida,
        limite_pretendido: result.limite_sugerido,
        justificativa_ia: `${result.justificativa_legal}\n\n--- Documentos Pendentes ---\n${result.documentos_pendentes}\n\n--- Alertas ---\n${result.alertas}`
      });
    } catch (error) {
      console.error('Erro na análise:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const salvarObservacoes = () => {
    updateCasoMutation.mutate({ observacoes: observacoesAnalise });
  };

  const capacidadeEstimada = calcularCapacidadeAutomatica();
  const totalRecursos = saldosBancarios + aplicacoesFinanceiras;

  return (
    <div className="space-y-6">
      {/* Dados de Protocolo e-CAC */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 p-6 backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/40 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Dados do Processo e-CAC</h3>
              <p className="text-xs text-slate-500">Protocolo eletrônico junto à Receita Federal</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_processo_ecac" className="text-xs font-medium text-slate-600">Número do Processo</Label>
              <Input
                id="numero_processo_ecac"
                value={numeroProcessoEcac}
                onChange={(e) => setNumeroProcessoEcac(e.target.value)}
                placeholder="Ex: 10880.000000/2026-00"
                className="bg-white/80 border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_protocolo_ecac" className="text-xs font-medium text-slate-600">Data de Protocolo</Label>
              <Input
                id="data_protocolo_ecac"
                type="date"
                value={dataProtocoloEcac}
                onChange={(e) => setDataProtocoloEcac(e.target.value)}
                className="bg-white/80 border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards - Cliente e Hipótese */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 transition-all hover:shadow-lg hover:shadow-slate-100/50 hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</span>
            </div>
            <p className="font-semibold text-slate-900 text-lg leading-tight">{cliente?.razao_social}</p>
            <p className="text-sm text-slate-500 mt-1.5 font-mono">{cliente?.cnpj}</p>
            {cliente?.modalidade_habilitacao && (
              <Badge className="mt-3 bg-blue-50 text-blue-700 border-blue-200 font-medium" variant="outline">
                {cliente.modalidade_habilitacao === 'analise_regularizacao'
                  ? 'Análise de Regularização'
                  : cliente.modalidade_habilitacao.charAt(0).toUpperCase() + cliente.modalidade_habilitacao.slice(1)}
              </Badge>
            )}
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 transition-all hover:shadow-lg hover:shadow-slate-100/50 hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50/0 to-violet-50/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100">
                <ShieldCheck className="h-4 w-4 text-violet-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Hipótese de Revisão</span>
            </div>
            <p className="font-semibold text-slate-900 leading-tight">
              {hipoteseLabels[caso.hipotese_revisao]}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Conforme Art. 4º da Portaria Coana 72/2020
            </p>
          </div>
        </div>
      </div>

      {/* Cálculo de Capacidade Financeira */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-100/30 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-100/20 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100">
                <Calculator className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Capacidade Financeira</h3>
                <p className="text-xs text-slate-500">Fórmula: (Saldos + Aplicações) / Taxa Dólar</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="space-y-2">
              <Label htmlFor="saldos_bancarios" className="text-xs font-medium text-slate-600">Saldos Bancários (R$)</Label>
              <Input
                id="saldos_bancarios"
                type="number"
                value={saldosBancarios}
                onChange={(e) => setSaldosBancarios(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="bg-white/80 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200 rounded-xl text-lg font-semibold"
              />
              <p className="text-xs text-slate-500">Últimos 3 meses - Art. 6º, I, a</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aplicacoes" className="text-xs font-medium text-slate-600">Aplicações Financeiras (R$)</Label>
              <Input
                id="aplicacoes"
                type="number"
                value={aplicacoesFinanceiras}
                onChange={(e) => setAplicacoesFinanceiras(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="bg-white/80 border-slate-200 focus:border-emerald-300 focus:ring-emerald-200 rounded-xl text-lg font-semibold"
              />
              <p className="text-xs text-slate-500">CDB, Fundos, Poupança, etc.</p>
            </div>
          </div>

          {totalRecursos > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  <p className="text-xs font-medium text-slate-500">Total Recursos</p>
                </div>
                <p className="text-xl font-bold text-slate-900">
                  R$ {totalRecursos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-emerald-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <p className="text-xs font-medium text-emerald-600">Capacidade USD</p>
                </div>
                <p className="text-xl font-bold text-emerald-700">
                  USD {capacidadeEstimada.toLocaleString('en-US', {minimumFractionDigits: 2})}
                </p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-slate-400" />
                  <p className="text-xs font-medium text-slate-500">Modalidade</p>
                </div>
                <p className="text-lg font-bold text-slate-900">
                  {capacidadeEstimada > 150000 ? 'Ilimitada' : 'Limitada'}
                </p>
                <p className="text-xs text-slate-500">Taxa: R$ 5,3076</p>
              </div>
            </div>
          )}

          <Button
            onClick={salvarDadosFinanceiros}
            disabled={updateCasoMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
          >
            {updateCasoMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Dados Financeiros
          </Button>
        </div>
      </div>

      {/* Análise com IA */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-50/60 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Análise Inteligente com IA</h3>
                <p className="text-xs text-slate-500">Validação automatizada baseada no Livro RADAR 2025</p>
              </div>
            </div>
            <Button
              onClick={calcularEstimativa}
              disabled={isCalculating || saldosBancarios === 0}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-violet-200/50 px-6"
            >
              {isCalculating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Analisar com IA
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-indigo-500" />
                <span className="text-sm font-medium text-indigo-700">Estimativa Validada</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {caso.estimativa_calculada
                  ? `USD ${caso.estimativa_calculada.toLocaleString('en-US', {minimumFractionDigits: 2})}`
                  : <span className="text-slate-400 text-xl">Aguardando análise</span>
                }
              </p>
              {caso.estimativa_calculada && (
                <div className="mt-3 flex items-center gap-2">
                  {caso.estimativa_calculada > 150000 ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-xs text-slate-600">
                    {caso.estimativa_calculada > 150000
                      ? 'Habilitação Ilimitada'
                      : caso.estimativa_calculada > 50000
                        ? 'Limitada USD 150.000'
                        : 'Limitada USD 50.000'
                    }
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">Modalidade Sugerida</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {caso.modalidade_pretendida
                  ? caso.modalidade_pretendida === 'analise_regularizacao'
                    ? 'Análise de Regularização'
                    : caso.modalidade_pretendida.charAt(0).toUpperCase() + caso.modalidade_pretendida.slice(1)
                  : <span className="text-slate-400 text-xl">Aguardando análise</span>
                }
              </p>
              {caso.modalidade_pretendida && (
                <Badge className={`mt-3 ${
                  caso.modalidade_pretendida === 'ilimitada'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-amber-100 text-amber-700 border-amber-200'
                }`} variant="outline">
                  {caso.modalidade_pretendida === 'ilimitada' ? 'Sem limites por operação' : 'Com limite por operação'}
                </Badge>
              )}
            </div>
          </div>

          {caso.justificativa_ia && (
            <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-5 mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Justificativa da Análise
              </p>
              <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                {caso.justificativa_ia}
              </div>
            </div>
          )}

          {/* Regras de Cálculo */}
          <div className="rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-100 p-5">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-700">
                <p className="font-semibold text-slate-900 mb-2">Regras de Cálculo (Livro RADAR 2025)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    <span><strong>Recursos (Art. 4º, I):</strong> Saldos + aplicações / taxa dólar</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    <span><strong>DAS (Art. 4º, III):</strong> Soma DAS 60 meses / cotação média</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    <span><strong>Taxa vigente:</strong> R$ 5,3076 (Portaria Coana 180/2026)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    <span><strong>Modalidades:</strong> Limitada (até USD 150k) | Ilimitada</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Observações */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100">
            <FileText className="h-5 w-5 text-slate-600" />
          </div>
          <h3 className="font-semibold text-slate-900">Observações e Anotações</h3>
        </div>
        <Textarea
          value={observacoesAnalise}
          onChange={(e) => setObservacoesAnalise(e.target.value)}
          placeholder="Adicione observações sobre a análise do caso..."
          rows={5}
          className="mb-4 bg-slate-50/50 border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 rounded-xl resize-none"
        />
        <Button
          onClick={salvarObservacoes}
          disabled={updateCasoMutation.isPending}
          variant="outline"
          className="rounded-xl"
        >
          {updateCasoMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Observações
        </Button>
      </div>
    </div>
  );
}
