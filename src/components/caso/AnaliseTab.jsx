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
  
  const queryClient = useQueryClient();

  const updateCasoMutation = useMutation({
    mutationFn: (data) => base44.entities.Caso.update(caso.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caso', caso.id] });
    }
  });

  const calcularEstimativa = async () => {
    setIsCalculating(true);
    
    const prompt = `Como especialista em comércio exterior brasileiro, calcule a estimativa da capacidade financeira para revisão de habilitação conforme IN 1984/2020 e Portaria Coana 72/2020.

Cliente: ${cliente?.razao_social}
CNPJ: ${cliente?.cnpj}
Modalidade Atual: ${cliente?.modalidade_habilitacao || 'Não informada'}
Limite Atual: ${cliente?.limite_atual ? `USD ${cliente.limite_atual}` : 'Não informado'}

Hipótese de Revisão: ${hipoteseLabels[caso.hipotese_revisao]}

Documentos disponíveis:
${documentos.map(d => `- ${d.nome_arquivo} (${d.tipo_documento})`).join('\n')}

Com base na hipótese de revisão, calcule:
1. A nova estimativa da capacidade financeira em USD
2. A modalidade de habilitação apropriada
3. O limite de operação recomendado

Considere as regras do Art. 2º da Portaria Coana 72:
- Numerador: maior valor entre soma de tributos (I a IV do caput Art. 2º) e soma de contribuições (inciso V)
- Denominador: cotação média do dólar dos 5 anos-calendário anteriores (R$ 3,52423 para 2015-2019)

Para a hipótese I (recursos financeiros), considere os extratos bancários.
Para hipótese III (DAS), considere os recolhimentos do Simples Nacional.
Para hipótese IV (CPRB), considere os recolhimentos da contribuição previdenciária.`;

    const schema = {
      type: "object",
      properties: {
        estimativa_usd: { type: "number" },
        modalidade_sugerida: { type: "string" },
        limite_sugerido: { type: "number" },
        justificativa: { type: "string" },
        observacoes_calculo: { type: "string" }
      }
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema
    });

    await updateCasoMutation.mutateAsync({
      estimativa_calculada: result.estimativa_usd,
      modalidade_pretendida: result.modalidade_sugerida,
      limite_pretendido: result.limite_sugerido,
      observacoes: `${observacoesAnalise}\n\n--- Análise IA ---\n${result.justificativa}\n\n${result.observacoes_calculo}`
    });

    setIsCalculating(false);
  };

  const salvarObservacoes = () => {
    updateCasoMutation.mutate({ observacoes: observacoesAnalise });
  };

  return (
    <div className="space-y-6">
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
                {cliente.modalidade_habilitacao.charAt(0).toUpperCase() + cliente.modalidade_habilitacao.slice(1)}
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

      {/* Calculation Section */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calculator className="h-5 w-5" /> Cálculo da Estimativa
            </span>
            <Button 
              onClick={calcularEstimativa} 
              disabled={isCalculating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCalculating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Calcular com IA
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <DollarSign className="h-5 w-5" />
                <span className="font-medium">Estimativa Calculada</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {caso.estimativa_calculada 
                  ? `USD ${caso.estimativa_calculada.toLocaleString()}`
                  : 'Pendente'
                }
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-xl">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <TrendingUp className="h-5 w-5" />
                <span className="font-medium">Modalidade Pretendida</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {caso.modalidade_pretendida 
                  ? caso.modalidade_pretendida.charAt(0).toUpperCase() + caso.modalidade_pretendida.slice(1)
                  : 'Pendente'
                }
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-xl">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Calculator className="h-5 w-5" />
                <span className="font-medium">Limite Pretendido</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {caso.limite_pretendido 
                  ? `USD ${caso.limite_pretendido.toLocaleString()}`
                  : 'Pendente'
                }
              </p>
            </div>
          </div>

          {/* Info about calculation */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-slate-400 mt-0.5" />
              <div className="text-sm text-slate-600">
                <p className="font-medium text-slate-700 mb-1">Base de Cálculo (Art. 2º Portaria Coana 72)</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Numerador: Maior valor entre tributos (IRPJ, CSLL, PIS/Pasep, Cofins, CPRB) e contribuições previdenciárias</li>
                  <li>Denominador: Cotação média do dólar dos 5 anos-calendário anteriores (R$ 3,52423)</li>
                  <li>Os documentos enviados serão analisados para extrair os valores relevantes</li>
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

      {/* Modalidades Reference */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Referência - Modalidades de Habilitação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(modalidadeInfo).map(([key, info]) => (
              <div key={key} className="p-4 border border-slate-200 rounded-xl">
                <Badge className="mb-2">{info.label}</Badge>
                <p className="font-medium text-slate-700">{info.limite}</p>
                <p className="text-sm text-slate-500 mt-2">{info.descricao}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}