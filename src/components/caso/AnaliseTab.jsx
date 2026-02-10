import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const hipoteseLabels = {
  recursos_financeiros_livres: "I - Recursos Financeiros de Livre Movimentação",
  recolhimento_tributos_das: "III - Recolhimento Tributos - DAS (Simples Nacional)",
  recolhimento_tributos_cprb: "IV - Recolhimento CPRB",
  retomada_atividades: "V - Retomada de Atividades"
};

const modalidadeInfo = {
  expressa: {
    label: "Expressa",
    limite: "Sem limite de valor",
    descricao: "Para empresas com ações negociadas em bolsa, empresas públicas/mistas, ou com capacidade estimada acima de USD 150.000.000"
  },
  limitada: {
    label: "Limitada",
    limite: "Até USD 150.000.000",
    descricao: "Limite de operação de até USD 50.000.000 ou USD 150.000.000 conforme capacidade financeira"
  },
  ilimitada: {
    label: "Ilimitada",
    limite: "Sem limite de valor",
    descricao: "Para empresas com capacidade financeira estimada acima do limite máximo"
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

  // Cálculo automático de capacidade financeira (50% conforme livro)
  const calcularCapacidadeAutomatica = () => {
    const totalRecursos = saldosBancarios + aplicacoesFinanceiras;
    const capacidadeReais = totalRecursos * 0.5;
    const taxaDolar = 5.3076; // Portaria Coana - válida até 31/12/2026
    return capacidadeReais / taxaDolar;
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
- Capacidade Calculada (50% regra geral): USD ${capacidadeAutomatica.toLocaleString('en-US', {maximumFractionDigits: 2})}

DOCUMENTOS DISPONÍVEIS:
${documentos.map(d => `- ${d.nome_arquivo} (${d.tipo_documento})`).join('\n')}

Com base no Livro RADAR 2025 e na legislação vigente, forneça:
1. Validação da estimativa calculada (50% dos recursos conforme Art. 6º Portaria Coana 72)
2. Modalidade de habilitação apropriada:
   - Limitada: até USD 150.000 por operação
   - Ilimitada: sem limites
3. Recomendações sobre documentação adicional necessária
4. Alertas sobre possíveis inconsistências ou pontos de atenção

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
        alertas: { type: "string", description: "Pontos de atenção identificados" }
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

    setIsCalculating(false);
  };

  const salvarObservacoes = () => {
    updateCasoMutation.mutate({ observacoes: observacoesAnalise });
  };

  const capacidadeEstimada = calcularCapacidadeAutomatica();

  return (
    <div className="space-y-6">
      {/* Dados de Protocolo e-CAC */}
      <Card className="border border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-lg">Dados do Processo e-CAC</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numero_processo_ecac">Número do Processo e-CAC</Label>
              <Input
                id="numero_processo_ecac"
                value={numeroProcessoEcac}
                onChange={(e) => setNumeroProcessoEcac(e.target.value)}
                placeholder="Ex: 10880.000000/2026-00"
              />
            </div>
            <div>
              <Label htmlFor="data_protocolo_ecac">Data de Protocolo no e-CAC</Label>
              <Input
                id="data_protocolo_ecac"
                type="date"
                value={dataProtocoloEcac}
                onChange={(e) => setDataProtocoloEcac(e.target.value)}
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-slate-900">{cliente?.razao_social}</p>
            <p className="text-sm text-slate-500 mt-1">CNPJ: {cliente?.cnpj}</p>
            {cliente?.modalidade_habilitacao && (
              <Badge className="mt-2" variant="outline">
                {cliente.modalidade_habilitacao === 'analise_regularizacao' 
                  ? 'Análise de Regularização'
                  : cliente.modalidade_habilitacao.charAt(0).toUpperCase() + cliente.modalidade_habilitacao.slice(1)}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Hipótese de Revisão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-slate-900">
              {hipoteseLabels[caso.hipotese_revisao]}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Conforme Art. 4º da Portaria Coana 72/2020
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cálculo Manual de Capacidade Financeira */}
      <Card className="border border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="text-lg">Cálculo da Capacidade Financeira</CardTitle>
          <p className="text-sm text-slate-500">Fórmula: 50% dos (Saldos Bancários + Aplicações) ÷ Taxa Dólar</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="saldos_bancarios">Saldos Bancários (R$)</Label>
              <Input
                id="saldos_bancarios"
                type="number"
                value={saldosBancarios}
                onChange={(e) => setSaldosBancarios(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              <p className="text-xs text-slate-500 mt-1">Últimos 3 meses - Art. 6º, I, a</p>
            </div>
            <div>
              <Label htmlFor="aplicacoes">Aplicações Financeiras (R$)</Label>
              <Input
                id="aplicacoes"
                type="number"
                value={aplicacoesFinanceiras}
                onChange={(e) => setAplicacoesFinanceiras(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              <p className="text-xs text-slate-500 mt-1">Incluir CDB, Fundos, etc.</p>
            </div>
          </div>

          {(saldosBancarios > 0 || aplicacoesFinanceiras > 0) && (
            <div className="p-4 bg-white border border-green-300 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Total de Recursos</p>
                  <p className="text-xl font-bold text-slate-900">
                    R$ {(saldosBancarios + aplicacoesFinanceiras).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Capacidade em USD</p>
                  <p className="text-xl font-bold text-green-600">
                    USD {capacidadeEstimada.toLocaleString('en-US', {minimumFractionDigits: 2})}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Taxa: R$ 5,3076</p>
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={salvarDadosFinanceiros}
            disabled={updateCasoMutation.isPending}
            variant="outline"
          >
            {updateCasoMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Dados Financeiros
          </Button>
        </CardContent>
      </Card>

      {/* Análise com IA */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Análise Detalhada com IA
            </span>
            <Button 
              onClick={calcularEstimativa} 
              disabled={isCalculating || saldosBancarios === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCalculating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Analisar com IA
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <DollarSign className="h-5 w-5" />
                <span className="font-medium">Estimativa Validada</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {caso.estimativa_calculada 
                  ? `USD ${caso.estimativa_calculada.toLocaleString('en-US', {minimumFractionDigits: 2})}`
                  : 'Pendente'
                }
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-xl">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <TrendingUp className="h-5 w-5" />
                <span className="font-medium">Modalidade Sugerida</span>
              </div>
              <p className="text-lg font-bold text-slate-900">
                {caso.modalidade_pretendida 
                  ? caso.modalidade_pretendida === 'analise_regularizacao'
                    ? 'Análise de Regularização'
                    : caso.modalidade_pretendida.charAt(0).toUpperCase() + caso.modalidade_pretendida.slice(1)
                  : 'Pendente'
                }
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-xl">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Calculator className="h-5 w-5" />
                <span className="font-medium">Limite Sugerido</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {caso.limite_pretendido 
                  ? `USD ${caso.limite_pretendido.toLocaleString('en-US')}`
                  : 'Pendente'
                }
              </p>
            </div>
          </div>

          {caso.justificativa_ia && (
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-medium text-slate-700 mb-2">Justificativa da Análise:</p>
              <div className="text-sm text-slate-600 whitespace-pre-wrap">
                {caso.justificativa_ia}
              </div>
            </div>
          )}

          {/* Info about calculation */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-slate-700">
                <p className="font-medium text-slate-900 mb-2">Regras de Cálculo (Livro RADAR 2025)</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Recursos Financeiros (Art. 4º, I):</strong> 50% dos saldos bancários + aplicações (Art. 6º, I)</li>
                  <li><strong>DAS (Art. 4º, III):</strong> Soma dos DAS dos últimos 60 meses ÷ cotação média do dólar</li>
                  <li><strong>CPRB (Art. 4º, IV):</strong> Soma dos DARF CPRB dos últimos 60 meses ÷ cotação média</li>
                  <li><strong>Taxa vigente:</strong> R$ 5,2208 (Portaria Coana 167/2025)</li>
                  <li><strong>Modalidades:</strong> Limitada (até USD 150.000/operação) | Ilimitada (sem limites)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observations */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Observações e Anotações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={observacoesAnalise}
            onChange={(e) => setObservacoesAnalise(e.target.value)}
            placeholder="Adicione observações sobre a análise do caso..."
            rows={6}
            className="mb-4"
          />
          <Button 
            onClick={salvarObservacoes}
            disabled={updateCasoMutation.isPending}
          >
            {updateCasoMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Observações
          </Button>
        </CardContent>
      </Card>


    </div>
  );
}