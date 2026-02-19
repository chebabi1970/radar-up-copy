/**
 * Calculadora de Capacidade Financeira
 * Calcula a capacidade financeira conforme Portaria Coana 72/2020, Art. 11
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { getAllHipoteses } from '@/config/documentosPorHipotese';

const COTACAO_DOLAR = 5.3067; // Cotação média dos últimos 5 anos

export default function CalculadoraCapacidade({ 
  caso, 
  onSalvarResultado 
}) {
  const [hipoteseSelecionada, setHipoteseSelecionada] = useState(caso?.hipotese_revisao || 'I');
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
  
  // Estados para Hipótese IV - CPRB
  const [receitasBrutasCPRB, setReceitasBrutasCPRB] = useState('');
  
  // Estados para Hipótese V - Início/Retomada < 5 anos
  const [tribsSeis1a4, setTribsSeis1a4] = useState('');
  const [contribSeis5, setContribSeis5] = useState('');
  
  const hipoteses = getAllHipoteses();

  useEffect(() => {
    setHipoteseSelecionada(caso?.hipotese_revisao || 'I');
  }, [caso?.hipotese_revisao]);

  const calcularCapacidade = () => {
    let numerador = 0;
    let formula = '';
    let detalhes = '';

    switch(hipoteseSelecionada) {
      case 'I':
        // Art. 11, I - Saldo de contas correntes + aplicações financeiras (mês anterior)
        numerador = parseFloat(saldosContasCorrente || 0) + parseFloat(aplicacoesFinanceiras || 0);
        formula = 'Saldos Bancários + Aplicações Financeiras';
        detalhes = `R$ ${parseFloat(saldosContasCorrente || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})} + R$ ${parseFloat(aplicacoesFinanceiras || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        break;

      case 'II':
        // Art. 11, II - Maior entre tributos I-IV ou contribuições V + tributos não recolhidos
        const tribs = parseFloat(somaTribs1a4 || 0);
        const contrib = parseFloat(somaContrib5 || 0);
        const naoRecolhidos = parseFloat(tribNaoRecolhidos || 0);
        numerador = Math.max(tribs, contrib) + naoRecolhidos;
        formula = 'Maior entre (Tributos I-IV ou Contribuições V) + Tributos Não Recolhidos';
        detalhes = `max(R$ ${tribs.toLocaleString('pt-BR', {minimumFractionDigits: 2})}, R$ ${contrib.toLocaleString('pt-BR', {minimumFractionDigits: 2})}) + R$ ${naoRecolhidos.toLocaleString('pt-BR', {minimumFractionDigits: 2})} = R$ ${Math.max(tribs, contrib).toLocaleString('pt-BR', {minimumFractionDigits: 2})} + R$ ${naoRecolhidos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        break;

      case 'III':
        // Art. 11, III - Receitas brutas DAS 60 meses / 20
        numerador = parseFloat(receitasBrutasDAS || 0) / 20;
        formula = 'Receitas Brutas DAS (60 meses) ÷ 20';
        detalhes = `R$ ${parseFloat(receitasBrutasDAS || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})} ÷ 20`;
        break;

      case 'IV':
        // Art. 11, IV - Receitas brutas CPRB 60 meses / 20
        numerador = parseFloat(receitasBrutasCPRB || 0) / 20;
        formula = 'Receitas Brutas CPRB (60 meses) ÷ 20';
        detalhes = `R$ ${parseFloat(receitasBrutasCPRB || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})} ÷ 20`;
        break;

      case 'V':
        // Art. 11, V - Maior entre tributos ou contribuições dos 6 meses x 10
        const tribsSeis = parseFloat(tribsSeis1a4 || 0);
        const contribSeis = parseFloat(contribSeis5 || 0);
        numerador = Math.max(tribsSeis, contribSeis) * 10;
        formula = 'Maior entre (Tributos I-IV ou Contribuições V dos 6 meses) × 10';
        detalhes = `max(R$ ${tribsSeis.toLocaleString('pt-BR', {minimumFractionDigits: 2})}, R$ ${contribSeis.toLocaleString('pt-BR', {minimumFractionDigits: 2})}) × 10 = R$ ${Math.max(tribsSeis, contribSeis).toLocaleString('pt-BR', {minimumFractionDigits: 2})} × 10`;
        break;

      default:
        return;
    }

    // Converter para USD (Art. 2º, § 3º, II)
    const valorUSD = numerador / COTACAO_DOLAR;

    // Determinar modalidade (IN RFB 1984/2020, Arts. 16 e 17)
    let modalidade = '';
    let limiteOperacao = 0;
    let corModalidade = '';
    let descricaoModalidade = '';

    if (valorUSD <= 50000) {
      modalidade = 'Radar Limitado';
      limiteOperacao = 50000;
      corModalidade = 'bg-amber-100 text-amber-800 border-amber-300';
      descricaoModalidade = 'Limite de US$ 50.000,00 por operação';
    } else if (valorUSD > 50000 && valorUSD <= 150000) {
      modalidade = 'Radar Limitado';
      limiteOperacao = 150000;
      corModalidade = 'bg-blue-100 text-blue-800 border-blue-300';
      descricaoModalidade = 'Limite de US$ 150.000,00 por operação';
    } else {
      modalidade = 'Habilitação Ilimitada';
      limiteOperacao = 0;
      corModalidade = 'bg-green-100 text-green-800 border-green-300';
      descricaoModalidade = 'Sem limite de valor por operação';
    }

    const resultadoFinal = {
      hipotese: hipoteseSelecionada,
      numerador: numerador,
      numeradorFormatado: numerador.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      formula: formula,
      detalhes: detalhes,
      cotacaoDolar: COTACAO_DOLAR,
      valorUSD: valorUSD,
      valorUSDFormatado: valorUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      modalidade: modalidade,
      limiteOperacao: limiteOperacao,
      limiteOperacaoFormatado: limiteOperacao > 0 ? limiteOperacao.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'Ilimitado',
      corModalidade: corModalidade,
      descricaoModalidade: descricaoModalidade,
      dataCalculo: new Date().toISOString()
    };

    setResultado(resultadoFinal);
  };

  const limparCalculadora = () => {
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
  };

  const salvarResultado = () => {
    if (resultado && onSalvarResultado) {
      onSalvarResultado(resultado);
    }
  };

  const formatarMoeda = (valor) => {
    if (!valor) return '';
    const numero = valor.replace(/\D/g, '');
    return (parseFloat(numero) / 100).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-600" />
            Calculadora de Capacidade Financeira
          </CardTitle>
          <CardDescription>
            Portaria COANA Nº 72/2020 - Art. 11
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Alerta Informativo */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700 space-y-2">
              <p className="font-medium">Como usar:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Selecione a hipótese de revisão</li>
                <li>Preencha os campos com os valores em Reais (R$)</li>
                <li>Clique em "Calcular Capacidade"</li>
                <li>O sistema calculará automaticamente a modalidade de habilitação</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seletor de Hipótese */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecione a Hipótese</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={hipoteseSelecionada}
            onValueChange={(value) => {
              setHipoteseSelecionada(value);
              limparCalculadora();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma hipótese" />
            </SelectTrigger>
            <SelectContent>
              {hipoteses.map((hip) => (
                <SelectItem key={hip.codigo} value={hip.codigo}>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      Hipótese {hip.codigo} - {hip.nome}
                    </span>
                    <span className="text-xs text-gray-500">
                      {hip.artigo}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Formulários por Hipótese */}
      {hipoteseSelecionada === 'I' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hipótese I - Recursos Financeiros Livres</CardTitle>
            <CardDescription>
              Saldos bancários e aplicações financeiras do mês anterior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="saldos">Saldos em Contas Correntes (R$)</Label>
              <Input
                id="saldos"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={saldosContasCorrente}
                onChange={(e) => setSaldosContasCorrente(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Soma de todos os saldos bancários do mês anterior
              </p>
            </div>
            <div>
              <Label htmlFor="aplicacoes">Aplicações Financeiras (R$)</Label>
              <Input
                id="aplicacoes"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={aplicacoesFinanceiras}
                onChange={(e) => setAplicacoesFinanceiras(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Aplicações de liquidez imediata do mês anterior
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hipoteseSelecionada === 'II' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hipótese II - Desonerações Tributárias</CardTitle>
            <CardDescription>
              Tributos recolhidos + tributos não recolhidos por desoneração
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tribs14">Soma Tributos I a IV (R$)</Label>
              <Input
                id="tribs14"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={somaTribs1a4}
                onChange={(e) => setSomaTribs1a4(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                IRPJ + CSLL + PIS/Pasep + Cofins (últimos 5 anos)
              </p>
            </div>
            <div>
              <Label htmlFor="contrib5">Soma Contribuições V (R$)</Label>
              <Input
                id="contrib5"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={somaContrib5}
                onChange={(e) => setSomaContrib5(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Contribuição Previdenciária (últimos 5 anos)
              </p>
            </div>
            <div>
              <Label htmlFor="naoRecolhidos">Tributos Não Recolhidos por Desoneração (R$)</Label>
              <Input
                id="naoRecolhidos"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={tribNaoRecolhidos}
                onChange={(e) => setTribNaoRecolhidos(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Tributos não recolhidos devido a isenções/imunidades
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hipoteseSelecionada === 'III' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hipótese III - DAS (Simples Nacional)</CardTitle>
            <CardDescription>
              Receitas brutas que serviram de base para o DAS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="receitasDAS">Soma das Receitas Brutas (60 meses) (R$)</Label>
              <Input
                id="receitasDAS"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={receitasBrutasDAS}
                onChange={(e) => setReceitasBrutasDAS(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Soma das receitas brutas mensais dos últimos 60 meses
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hipoteseSelecionada === 'IV' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hipótese IV - CPRB</CardTitle>
            <CardDescription>
              Receitas brutas que serviram de base para a CPRB
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="receitasCPRB">Soma das Receitas Brutas (60 meses) (R$)</Label>
              <Input
                id="receitasCPRB"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={receitasBrutasCPRB}
                onChange={(e) => setReceitasBrutasCPRB(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Soma das receitas brutas mensais dos últimos 60 meses
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hipoteseSelecionada === 'V' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hipótese V - Início/Retomada {'<'} 5 anos</CardTitle>
            <CardDescription>
              Tributos recolhidos nos primeiros 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tribsSeis14">Soma Tributos I a IV (6 meses) (R$)</Label>
              <Input
                id="tribsSeis14"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={tribsSeis1a4}
                onChange={(e) => setTribsSeis1a4(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                IRPJ + CSLL + PIS/Pasep + Cofins (6 meses)
              </p>
            </div>
            <div>
              <Label htmlFor="contribSeis5">Soma Contribuições V (6 meses) (R$)</Label>
              <Input
                id="contribSeis5"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={contribSeis5}
                onChange={(e) => setContribSeis5(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Contribuição Previdenciária (6 meses)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botões */}
      <div className="flex gap-3">
        <Button
          onClick={calcularCapacidade}
          className="flex-1"
          size="lg"
        >
          <Calculator className="h-5 w-5 mr-2" />
          Calcular Capacidade
        </Button>
        <Button
          onClick={limparCalculadora}
          variant="outline"
          size="lg"
        >
          Limpar
        </Button>
      </div>

      {/* Resultado */}
      {resultado && (
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Resultado do Cálculo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Cálculo Detalhado */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Fórmula Aplicada:</p>
                <p className="text-sm text-gray-900">{resultado.formula}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Detalhes do Cálculo:</p>
                <p className="text-sm text-gray-900 font-mono">{resultado.detalhes}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                <div>
                  <p className="text-sm font-medium text-gray-600">Numerador (R$):</p>
                  <p className="text-2xl font-bold text-gray-900">{resultado.numeradorFormatado}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Cotação USD:</p>
                  <p className="text-2xl font-bold text-gray-900">R$ {resultado.cotacaoDolar.toFixed(4)}</p>
                </div>
              </div>
            </div>

            {/* Capacidade Financeira */}
            <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-700">Capacidade Financeira Estimada:</p>
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-4xl font-bold text-blue-900">{resultado.valorUSDFormatado}</p>
            </div>

            {/* Modalidade de Habilitação */}
            <div className={`p-6 rounded-lg border-2 ${resultado.corModalidade}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Modalidade de Habilitação:</p>
                <TrendingUp className="h-6 w-6" />
              </div>
              <p className="text-3xl font-bold mb-2">{resultado.modalidade}</p>
              <p className="text-sm">{resultado.descricaoModalidade}</p>
              {resultado.limiteOperacao > 0 && (
                <p className="text-lg font-semibold mt-3">
                  Limite: {resultado.limiteOperacaoFormatado}
                </p>
              )}
            </div>

            {/* Botão Salvar */}
            <Button
              onClick={salvarResultado}
              className="w-full"
              size="lg"
              variant="default"
            >
              Salvar Resultado no Caso
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
