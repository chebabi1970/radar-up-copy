/**
 * Dashboard Unificado de Análise
 * Visão consolidada do status do caso, progresso e próximas ações
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
  Target,
  Activity
} from 'lucide-react';
import { analisarDocumentoIndividual } from '@/utils/documentAnalysis';
import { executarAnaliseCruzadaCompleta } from '@/utils/crossDocumentAnalysis';

const tipoDocumentoLabels = {
  requerimento_das: "Requerimento DAS",
  documento_identificacao_responsavel: "Doc. Identificação Responsável",
  procuracao: "Procuração",
  documento_identificacao_procurador: "Doc. Identificação Procurador",
  contrato_social: "Contrato Social",
  certidao_junta_comercial: "Certidão Junta Comercial",
  conta_energia: "Conta de Energia",
  plano_internet: "Plano de Internet",
  guia_iptu: "Guia IPTU",
  extrato_bancario_corrente: "Extratos Bancários",
  balancete_verificacao: "Balancete",
  balanco_patrimonial_integralizacao: "Balanço Patrimonial",
  das_simples_nacional: "DAS",
  darf_cprb: "DARF CPRB",
  contrato_mutuo: "Contrato de Mútuo",
  comprovante_iof: "Comprovante IOF"
};

export default function DashboardUnificado({ caso, documentos = [], cliente = {}, onAcaoClick }) {
  const [analiseIndividual, setAnaliseIndividual] = useState([]);
  const [analiseCruzada, setAnaliseCruzada] = useState(null);
  const [analisando, setAnalisando] = useState(false);
  const [progressoAnalise, setProgressoAnalise] = useState(0);

  useEffect(() => {
    if (documentos.length > 0) {
      executarAnalises();
    }
  }, [documentos]);

  const executarAnalises = async () => {
    setAnalisando(true);
    setProgressoAnalise(0);

    try {
      // 1. Análise Individual
      const resultadosIndividuais = [];
      for (let i = 0; i < documentos.length; i++) {
        const doc = documentos[i];
        try {
          const resultado = await analisarDocumentoIndividual(doc);
          resultadosIndividuais.push(resultado);
        } catch (error) {
          console.error(`Erro ao analisar documento ${doc.id}:`, error);
        }
        setProgressoAnalise(((i + 1) / documentos.length) * 50);
      }
      setAnaliseIndividual(resultadosIndividuais);

      // 2. Análise Cruzada
      setProgressoAnalise(60);
      const resultadoCruzada = await executarAnaliseCruzadaCompleta(documentos, cliente);
      setAnaliseCruzada(resultadoCruzada);
      setProgressoAnalise(100);

    } catch (error) {
      console.error('Erro na análise:', error);
    } finally {
      setAnalisando(false);
    }
  };

  // Cálculos de métricas
  const totalDocumentos = documentos.length;
  const documentosAnalisados = analiseIndividual.length;
  const documentosValidos = analiseIndividual.filter(a => a.valido).length;
  const problemasCriticos = analiseIndividual.reduce((sum, a) => 
    sum + a.problemas.filter(p => p.severidade === 'critico').length, 0
  );
  const problemasAltos = analiseIndividual.reduce((sum, a) => 
    sum + a.problemas.filter(p => p.severidade === 'alto').length, 0
  );

  const progressoDocumentacao = totalDocumentos > 0 
    ? Math.round((documentosAnalisados / totalDocumentos) * 100)
    : 0;

  const scoreGeral = analiseIndividual.length > 0
    ? Math.round(analiseIndividual.reduce((sum, a) => sum + a.score, 0) / analiseIndividual.length)
    : 0;

  const inconsistenciasCruzadas = analiseCruzada?.resumo?.inconsistencias_criticas || 0;
  const inconsistenciasAltasCruzadas = analiseCruzada?.resumo?.inconsistencias_altas || 0;

  // Determina próxima ação
  const determinarProximaAcao = () => {
    if (totalDocumentos === 0) {
      return {
        titulo: 'Enviar Documentos',
        descricao: 'Comece fazendo upload dos documentos necessários para análise',
        acao: 'upload',
        icone: FileText,
        cor: 'blue'
      };
    }

    if (problemasCriticos > 0) {
      return {
        titulo: 'Corrigir Problemas Críticos',
        descricao: `${problemasCriticos} problema(s) crítico(s) detectado(s) que impedem a aprovação`,
        acao: 'corrigir_criticos',
        icone: AlertCircle,
        cor: 'red'
      };
    }

    if (inconsistenciasCruzadas > 0) {
      return {
        titulo: 'Resolver Inconsistências',
        descricao: `${inconsistenciasCruzadas} inconsistência(s) crítica(s) entre documentos`,
        acao: 'resolver_inconsistencias',
        icone: AlertTriangle,
        cor: 'orange'
      };
    }

    if (problemasAltos > 0 || inconsistenciasAltasCruzadas > 0) {
      return {
        titulo: 'Revisar Alertas',
        descricao: 'Existem alertas que requerem atenção antes do protocolo',
        acao: 'revisar_alertas',
        icone: AlertTriangle,
        cor: 'yellow'
      };
    }

    if (scoreGeral >= 90) {
      return {
        titulo: 'Protocolar Caso',
        descricao: 'Documentação completa e aprovada. Pronto para protocolo!',
        acao: 'protocolar',
        icone: CheckCircle2,
        cor: 'green'
      };
    }

    return {
      titulo: 'Completar Documentação',
      descricao: 'Continue enviando os documentos necessários',
      acao: 'upload',
      icone: FileText,
      cor: 'blue'
    };
  };

  const proximaAcao = determinarProximaAcao();
  const ProximaAcaoIcone = proximaAcao.icone;

  return (
    <div className="space-y-6">
      {/* Header com Status Geral */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-500" />
              Visão Geral do Caso
            </CardTitle>
            <Badge 
              variant="outline" 
              className={`text-lg px-4 py-1 ${
                scoreGeral >= 90 ? 'bg-green-100 text-green-800 border-green-300' :
                scoreGeral >= 70 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                'bg-red-100 text-red-800 border-red-300'
              }`}
            >
              Score: {scoreGeral}/100
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Barra de Progresso */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progresso da Análise
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {progressoDocumentacao}%
                </span>
              </div>
              <Progress value={progressoDocumentacao} className="h-3" />
            </div>

            {/* Métricas em Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Documentos */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Documentos</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {documentosAnalisados}/{totalDocumentos}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Conformidade */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Conformidade</p>
                      <p className="text-2xl font-bold text-green-900">
                        {documentosValidos}/{documentosAnalisados}
                      </p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Alertas */}
              <Card className={`${
                problemasCriticos > 0 ? 'bg-red-50 border-red-200' :
                problemasAltos > 0 ? 'bg-yellow-50 border-yellow-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${
                        problemasCriticos > 0 ? 'text-red-600' :
                        problemasAltos > 0 ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        Alertas
                      </p>
                      <p className={`text-2xl font-bold ${
                        problemasCriticos > 0 ? 'text-red-900' :
                        problemasAltos > 0 ? 'text-yellow-900' :
                        'text-gray-900'
                      }`}>
                        {problemasCriticos + problemasAltos}
                      </p>
                    </div>
                    <AlertTriangle className={`h-8 w-8 ${
                      problemasCriticos > 0 ? 'text-red-500' :
                      problemasAltos > 0 ? 'text-yellow-500' :
                      'text-gray-400'
                    }`} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Próxima Ação */}
      <Card className={`border-2 border-${proximaAcao.cor}-300 bg-${proximaAcao.cor}-50`}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg bg-${proximaAcao.cor}-100`}>
              <Target className={`h-6 w-6 text-${proximaAcao.cor}-600`} />
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold text-${proximaAcao.cor}-900 mb-1`}>
                🎯 Próxima Ação: {proximaAcao.titulo}
              </h3>
              <p className={`text-sm text-${proximaAcao.cor}-700 mb-3`}>
                {proximaAcao.descricao}
              </p>
              <Button 
                onClick={() => onAcaoClick && onAcaoClick(proximaAcao.acao)}
                className="gap-2"
              >
                <ProximaAcaoIcone className="h-4 w-4" />
                {proximaAcao.titulo}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inconsistências Críticas */}
      {(problemasCriticos > 0 || inconsistenciasCruzadas > 0) && (
        <Card className="border-2 border-red-300">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Inconsistências Críticas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {/* Problemas Individuais */}
              {analiseIndividual
                .filter(a => a.problemas.some(p => p.severidade === 'critico'))
                .map(analise => (
                  <Alert key={analise.documentoId} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <span className="font-medium">
                        {tipoDocumentoLabels[analise.tipo] || analise.tipo}:
                      </span>{' '}
                      {analise.problemas
                        .filter(p => p.severidade === 'critico')
                        .map(p => p.mensagem)
                        .join(', ')}
                    </AlertDescription>
                  </Alert>
                ))}

              {/* Problemas Cruzados */}
              {analiseCruzada?.resultados
                .filter(r => r.nivel === 'critico' && !r.passou)
                .map((resultado, idx) => (
                  <Alert key={idx} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <span className="font-medium">{resultado.nome}:</span>{' '}
                      {resultado.discrepancias[0]?.mensagem || resultado.sugestao}
                    </AlertDescription>
                  </Alert>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Análise em Progresso */}
      {analisando && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Analisando documentos com IA...
                </p>
                <Progress value={progressoAnalise} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Visual (Opcional) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline do Processo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                totalDocumentos > 0 ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {totalDocumentos > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">Upload de Documentos</p>
                <p className="text-sm text-gray-500">
                  {totalDocumentos > 0 ? `${totalDocumentos} documentos enviados` : 'Pendente'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                documentosAnalisados > 0 ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {documentosAnalisados > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">Análise Individual</p>
                <p className="text-sm text-gray-500">
                  {documentosAnalisados > 0 
                    ? `${documentosAnalisados} documentos analisados` 
                    : 'Aguardando documentos'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                analiseCruzada ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {analiseCruzada ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">Análise Cruzada</p>
                <p className="text-sm text-gray-500">
                  {analiseCruzada 
                    ? `${analiseCruzada.resumo.total_regras} regras verificadas` 
                    : 'Aguardando análise individual'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                scoreGeral >= 90 ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {scoreGeral >= 90 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">Protocolo</p>
                <p className="text-sm text-gray-500">
                  {scoreGeral >= 90 ? 'Pronto para protocolar' : 'Aguardando aprovação'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
