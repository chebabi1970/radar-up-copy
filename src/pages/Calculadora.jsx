import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, FileText, DollarSign, Building2, Clock, Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Calculadora() {
  const [hipoteseSelecionada, setHipoteseSelecionada] = useState('');
  const [resultado, setResultado] = useState(null);

  // Estados para Hipótese I - Recursos Financeiros Livres
  const [saldosContasCorrente, setSaldosContasCorrente] = useState('');
  const [aplicacoesFinanceiras, setAplicacoesFinanceiras] = useState('');

  // Estados para Hipótese II - Desonerações Tributárias
  const [somaTribs1a4, setSomaTribs1a4] = useState('');
  const [somaContrib5, setSomaContrib5] = useState('');
  const [tribNaoRecolhidos, setTribNaoRecolhidos] = useState('');

  // Estados para Hipótese III - DAS/Simples Nacional
  const [receitasBrutasDAS, setReceitasBrutasDAS] = useState('');
  const [uploadingDAS, setUploadingDAS] = useState(false);

  // Estados para Hipótese IV - CPRB
  const [receitasBrutasCPRB, setReceitasBrutasCPRB] = useState('');

  // Estados para Hipótese V - Início/Retomada < 5 anos
  const [tribsSeis1a4, setTribsSeis1a4] = useState('');
  const [contribSeis5, setContribSeis5] = useState('');
  const [uploadingTributos, setUploadingTributos] = useState(false);

  const calcularCapacidade = () => {
    let numerador = 0;
    let formula = '';

    switch(hipoteseSelecionada) {
      case 'I':
        // Saldo de contas correntes + aplicações financeiras (mês anterior)
        numerador = parseFloat(saldosContasCorrente || 0) + parseFloat(aplicacoesFinanceiras || 0);
        formula = 'Saldos Bancários + Aplicações Financeiras';
        break;

      case 'II':
        // Maior entre tributos I-IV ou contribuições V + tributos não recolhidos
        const tribs = parseFloat(somaTribs1a4 || 0);
        const contrib = parseFloat(somaContrib5 || 0);
        const naoRecolhidos = parseFloat(tribNaoRecolhidos || 0);
        numerador = Math.max(tribs, contrib) + naoRecolhidos;
        formula = 'Maior entre (Tributos I-IV ou Contribuições V) + Tributos Não Recolhidos';
        break;

      case 'III':
        // Receitas brutas DAS 60 meses / 20
        numerador = parseFloat(receitasBrutasDAS || 0) / 20;
        formula = 'Receitas Brutas DAS (60 meses) ÷ 20';
        break;

      case 'IV':
        // Receitas brutas CPRB 60 meses / 20
        numerador = parseFloat(receitasBrutasCPRB || 0) / 20;
        formula = 'Receitas Brutas CPRB (60 meses) ÷ 20';
        break;

      case 'V':
        // Maior entre tributos ou contribuições dos 6 meses x 10
        const tribsSeis = parseFloat(tribsSeis1a4 || 0);
        const contribSeis = parseFloat(contribSeis5 || 0);
        numerador = Math.max(tribsSeis, contribSeis) * 10;
        formula = 'Maior entre (Tributos I-IV ou Contribuições V dos 6 meses) × 10';
        break;

      default:
        return;
    }

    // Converter para USD
    const cotacaoDolar = 5.3067;
    const valorUSD = numerador / cotacaoDolar;

    // Determinar modalidade
    let modalidade = '';
    let limiteOperacao = 0;
    let corModalidade = '';

    if (valorUSD < 50000) {
      modalidade = 'Radar Limitado';
      limiteOperacao = 50000;
      corModalidade = 'text-amber-700';
    } else if (valorUSD >= 50000 && valorUSD < 150000) {
      modalidade = 'Radar Limitado';
      limiteOperacao = 150000;
      corModalidade = 'text-blue-700';
    } else {
      modalidade = 'Habilitação Ilimitada';
      limiteOperacao = 0;
      corModalidade = 'text-green-700';
    }

    setResultado({
      valor: numerador,
      formula: formula,
      valorFormatado: numerador.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      valorUSD: valorUSD,
      valorUSDFormatado: valorUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      modalidade: modalidade,
      limiteOperacao: limiteOperacao,
      corModalidade: corModalidade
    });
  };

  const limparCalculadora = () => {
    setHipoteseSelecionada('');
    setResultado(null);
    setSaldosContasCorrente('');
    setAplicacoesFinanceiras('');
    setSomaTribs1a4('');
    setSomaContrib5('');
    setTribNaoRecolhidos('');
    setReceitasBrutasDAS('');
    setReceitasBrutasCPRB('');
    setTribsSeis1a4('');
    setContribSeis5('');
    setUploadingDAS(false);
    setUploadingTributos(false);
  };

  const processarPlanilhaDAS = async (file) => {
    setUploadingDAS(true);
    try {
      // Upload do arquivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extrair dados com schema para faturamento mensal
      const resultado = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            faturamentos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mes: { type: "string" },
                  receita_bruta: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (resultado.status === 'success' && resultado.output?.faturamentos) {
        const total = resultado.output.faturamentos.reduce((acc, item) => acc + (item.receita_bruta || 0), 0);
        setReceitasBrutasDAS(total.toString());
        alert(`Planilha processada com sucesso! ${resultado.output.faturamentos.length} meses identificados.`);
      } else {
        alert('Erro ao processar planilha: ' + (resultado.details || 'Formato inválido'));
      }
    } catch (error) {
      alert('Erro ao processar arquivo: ' + error.message);
    } finally {
      setUploadingDAS(false);
    }
  };

  const processarPlanilhaTributos = async (file) => {
    setUploadingTributos(true);
    try {
      // Upload do arquivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extrair dados com schema para tributos mensais
      const resultado = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            tributos_i_a_iv: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mes: { type: "string" },
                  valor: { type: "number" }
                }
              }
            },
            contribuicoes_v: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mes: { type: "string" },
                  valor: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (resultado.status === 'success' && resultado.output) {
        const totalTribs = resultado.output.tributos_i_a_iv?.reduce((acc, item) => acc + (item.valor || 0), 0) || 0;
        const totalContrib = resultado.output.contribuicoes_v?.reduce((acc, item) => acc + (item.valor || 0), 0) || 0;
        
        setTribsSeis1a4(totalTribs.toString());
        setContribSeis5(totalContrib.toString());
        alert('Planilha processada com sucesso!');
      } else {
        alert('Erro ao processar planilha: ' + (resultado.details || 'Formato inválido'));
      }
    } catch (error) {
      alert('Erro ao processar arquivo: ' + error.message);
    } finally {
      setUploadingTributos(false);
    }
  };

  const hipoteses = [
    {
      value: 'I',
      label: 'Hipótese I - Recursos Financeiros Livres',
      icon: DollarSign,
      description: 'Saldos bancários e aplicações financeiras de liquidez imediata',
      artigo: 'Art. 11, I'
    },
    {
      value: 'II',
      label: 'Hipótese II - Desonerações Tributárias',
      icon: FileText,
      description: 'Isenções e imunidades tributárias',
      artigo: 'Art. 11, II'
    },
    {
      value: 'III',
      label: 'Hipótese III - DAS (Simples Nacional)',
      icon: Building2,
      description: 'Recolhimentos via DAS - optantes do Simples Nacional',
      artigo: 'Art. 11, III'
    },
    {
      value: 'IV',
      label: 'Hipótese IV - CPRB',
      icon: TrendingUp,
      description: 'Contribuição Previdenciária sobre Receita Bruta',
      artigo: 'Art. 11, IV'
    },
    {
      value: 'V',
      label: 'Hipótese V - Início/Retomada < 5 anos',
      icon: Clock,
      description: 'Empresas com início ou retomada de atividades há menos de 5 anos',
      artigo: 'Art. 11, V'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 md:p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="h-8 w-8" />
            <h1 className="text-2xl md:text-3xl font-bold">Calculadora de Capacidade Financeira</h1>
          </div>
          <p className="text-blue-100">Portaria COANA Nº 72/2020 - Art. 11</p>
        </div>

        {/* Seleção de Hipótese */}
        <Card>
          <CardHeader>
            <CardTitle>Selecione a Hipótese</CardTitle>
            <CardDescription>Escolha a base legal aplicável ao caso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {hipoteses.map((hip) => {
                const Icon = hip.icon;
                return (
                  <button
                    key={hip.value}
                    onClick={() => {
                      setHipoteseSelecionada(hip.value);
                      setResultado(null);
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                      hipoteseSelecionada === hip.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        hipoteseSelecionada === hip.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{hip.label}</h3>
                          <Badge variant="outline" className="text-xs">{hip.artigo}</Badge>
                        </div>
                        <p className="text-sm text-slate-600">{hip.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Formulários por Hipótese */}
        {hipoteseSelecionada && (
          <Card>
            <CardHeader>
              <CardTitle>Dados para Cálculo</CardTitle>
              <CardDescription>
                Preencha os valores necessários para a {hipoteses.find(h => h.value === hipoteseSelecionada)?.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hipótese I */}
              {hipoteseSelecionada === 'I' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="saldos">Saldos em Contas Correntes (mês anterior) - R$</Label>
                    <Input
                      id="saldos"
                      type="number"
                      step="0.01"
                      value={saldosContasCorrente}
                      onChange={(e) => setSaldosContasCorrente(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aplicacoes">Aplicações Financeiras (mês anterior) - R$</Label>
                    <Input
                      id="aplicacoes"
                      type="number"
                      step="0.01"
                      value={aplicacoesFinanceiras}
                      onChange={(e) => setAplicacoesFinanceiras(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700">
                    <p className="font-medium mb-1">Fórmula:</p>
                    <p>Capacidade = Saldos Bancários + Aplicações Financeiras</p>
                  </div>
                </>
              )}

              {/* Hipótese II */}
              {hipoteseSelecionada === 'II' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="tribs14">Soma dos Tributos (Incisos I a IV) - R$</Label>
                    <Input
                      id="tribs14"
                      type="number"
                      step="0.01"
                      value={somaTribs1a4}
                      onChange={(e) => setSomaTribs1a4(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contrib5">Soma das Contribuições (Inciso V) - R$</Label>
                    <Input
                      id="contrib5"
                      type="number"
                      step="0.01"
                      value={somaContrib5}
                      onChange={(e) => setSomaContrib5(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="naoRecolhidos">Tributos Não Recolhidos (Desonerações) - R$</Label>
                    <Input
                      id="naoRecolhidos"
                      type="number"
                      step="0.01"
                      value={tribNaoRecolhidos}
                      onChange={(e) => setTribNaoRecolhidos(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700">
                    <p className="font-medium mb-1">Fórmula:</p>
                    <p>Capacidade = MAIOR(Tributos I-IV, Contribuições V) + Tributos Não Recolhidos</p>
                  </div>
                </>
              )}

              {/* Hipótese III */}
              {hipoteseSelecionada === 'III' && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="font-medium text-amber-900 mb-2">📊 Upload de Planilha de Faturamento</p>
                    <p className="text-sm text-amber-800 mb-3">
                      Faça upload da planilha com o faturamento mensal dos últimos 60 meses (Excel ou CSV)
                    </p>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              processarPlanilhaDAS(e.target.files[0]);
                            }
                          }}
                          disabled={uploadingDAS}
                        />
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-colors ${
                          uploadingDAS 
                            ? 'bg-slate-100 border-slate-300 cursor-not-allowed' 
                            : 'bg-white border-amber-300 hover:bg-amber-50'
                        }`}>
                          {uploadingDAS ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Processando...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              <span className="text-sm font-medium">Upload Planilha</span>
                            </>
                          )}
                        </div>
                      </label>
                      <span className="text-xs text-slate-500">ou preencha manualmente abaixo</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receitasDAS">Somatório Receitas Brutas DAS (60 meses) - R$</Label>
                    <Input
                      id="receitasDAS"
                      type="number"
                      step="0.01"
                      value={receitasBrutasDAS}
                      onChange={(e) => setReceitasBrutasDAS(e.target.value)}
                      placeholder="0,00"
                    />
                    <p className="text-xs text-slate-500">
                      Base de cálculo dos valores recolhidos via DAS nos últimos 60 meses
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700">
                    <p className="font-medium mb-1">Fórmula:</p>
                    <p>Capacidade = Receitas Brutas DAS (60 meses) ÷ 20</p>
                  </div>
                </>
              )}

              {/* Hipótese IV */}
              {hipoteseSelecionada === 'IV' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="receitasCPRB">Somatório Receitas Brutas CPRB (60 meses) - R$</Label>
                    <Input
                      id="receitasCPRB"
                      type="number"
                      step="0.01"
                      value={receitasBrutasCPRB}
                      onChange={(e) => setReceitasBrutasCPRB(e.target.value)}
                      placeholder="0,00"
                    />
                    <p className="text-xs text-slate-500">
                      Base de cálculo da CPRB nos últimos 60 meses
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700">
                    <p className="font-medium mb-1">Fórmula:</p>
                    <p>Capacidade = Receitas Brutas CPRB (60 meses) ÷ 20</p>
                  </div>
                </>
              )}

              {/* Hipótese V */}
              {hipoteseSelecionada === 'V' && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="font-medium text-amber-900 mb-2">📊 Upload de Planilha de Tributos</p>
                    <p className="text-sm text-amber-800 mb-3">
                      Faça upload da planilha com tributos dos últimos 6 meses (Excel ou CSV)
                    </p>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              processarPlanilhaTributos(e.target.files[0]);
                            }
                          }}
                          disabled={uploadingTributos}
                        />
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-colors ${
                          uploadingTributos 
                            ? 'bg-slate-100 border-slate-300 cursor-not-allowed' 
                            : 'bg-white border-amber-300 hover:bg-amber-50'
                        }`}>
                          {uploadingTributos ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Processando...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              <span className="text-sm font-medium">Upload Planilha</span>
                            </>
                          )}
                        </div>
                      </label>
                      <span className="text-xs text-slate-500">ou preencha manualmente abaixo</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tribsSeis">Soma Tributos I-IV (6 meses anteriores) - R$</Label>
                    <Input
                      id="tribsSeis"
                      type="number"
                      step="0.01"
                      value={tribsSeis1a4}
                      onChange={(e) => setTribsSeis1a4(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contribSeis">Soma Contribuições V (6 meses anteriores) - R$</Label>
                    <Input
                      id="contribSeis"
                      type="number"
                      step="0.01"
                      value={contribSeis5}
                      onChange={(e) => setContribSeis5(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700">
                    <p className="font-medium mb-1">Fórmula:</p>
                    <p>Capacidade = MAIOR(Tributos I-IV, Contribuições V) dos 6 meses × 10</p>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={calcularCapacidade} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcular Capacidade
                </Button>
                <Button onClick={limparCalculadora} variant="outline">
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultado */}
        {resultado && (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Resultado do Cálculo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-green-200">
                <div className="text-sm text-slate-600 mb-1">Capacidade Financeira Estimada (BRL)</div>
                <div className="text-3xl font-bold text-green-700 mb-4">{resultado.valorFormatado}</div>
                
                <div className="border-t border-slate-200 pt-4 mb-4">
                  <div className="text-sm text-slate-600 mb-1">Valor em USD (Cotação: R$ 5,3067)</div>
                  <div className="text-4xl font-bold text-blue-700 mb-2">{resultado.valorUSDFormatado}</div>
                </div>

                <div className="text-sm text-slate-600 mb-3">
                  <span className="font-medium">Fórmula aplicada:</span> {resultado.formula}
                </div>
              </div>

              <div className={`bg-white rounded-lg p-6 border-2 ${
                resultado.modalidade === 'Habilitação Ilimitada' 
                  ? 'border-green-500' 
                  : 'border-blue-500'
              }`}>
                <div className="text-sm text-slate-600 mb-2">Modalidade de Habilitação</div>
                <div className={`text-3xl font-bold mb-3 ${resultado.corModalidade}`}>
                  {resultado.modalidade}
                </div>
                {resultado.limiteOperacao > 0 && (
                  <div className="text-lg font-semibold text-slate-700">
                    Limite: USD {resultado.limiteOperacao.toLocaleString('en-US')}
                  </div>
                )}
                {resultado.modalidade === 'Habilitação Ilimitada' && (
                  <div className="text-lg font-semibold text-green-700">
                    ✓ Sem limite de operação
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-slate-900 mb-2">⚖️ Base Legal</p>
                <p className="text-slate-700 mb-2">
                  Portaria COANA Nº 72, de 29/10/2020 - Artigo 11, {hipoteseSelecionada === 'I' ? 'Inciso I' : hipoteseSelecionada === 'II' ? 'Inciso II' : hipoteseSelecionada === 'III' ? 'Inciso III' : hipoteseSelecionada === 'IV' ? 'Inciso IV' : 'Inciso V'}
                </p>
                <p className="text-slate-700">
                  Artigo 4º - {hipoteses.find(h => h.value === hipoteseSelecionada)?.description}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-900 mb-2">📋 Critérios de Classificação</p>
                <ul className="space-y-1 text-xs">
                  <li>• Menor que USD 50.000,00 → Radar Limitado USD 50.000,00</li>
                  <li>• Entre USD 50.000,00 e USD 149.999,99 → Radar Limitado USD 150.000,00</li>
                  <li>• Igual ou maior que USD 150.000,00 → Habilitação Ilimitada</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">📚 Referências Normativas</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-2">
            <p>
              <strong>Portaria COANA Nº 72/2020:</strong> Estabelece procedimentos para revisão de estimativa de capacidade financeira.
            </p>
            <p>
              <strong>Artigo 2º:</strong> Define os tributos considerados na estimativa de capacidade financeira (IRPJ, CSLL, PIS/Pasep, Cofins e Contribuição Previdenciária).
            </p>
            <p>
              <strong>Artigo 4º:</strong> Lista as hipóteses que justificam a revisão de estimativa.
            </p>
            <p>
              <strong>Artigo 11:</strong> Determina como calcular a nova estimativa conforme a hipótese invocada.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}