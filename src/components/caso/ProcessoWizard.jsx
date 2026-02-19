/**
 * Wizard de Orientação Progressiva
 * Guia passo a passo para completar o processo de habilitação
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  FileText,
  Search,
  ClipboardCheck,
  Send,
  Sparkles
} from 'lucide-react';

/**
 * Definição das etapas do processo
 */
const ETAPAS = [
  {
    id: 'documentos',
    titulo: 'Enviar Documentos',
    descricao: 'Faça upload de todos os documentos necessários',
    icone: FileText,
    cor: 'blue',
    requisitos: [
      'Requerimento DAS',
      'Documentos de Identificação',
      'Contrato Social e Alterações',
      'Comprovantes de Endereço',
      'Extratos Bancários (últimos 3 meses)',
      'Balancete de Verificação',
      'Comprovantes de Tributos (DAS/DARF)'
    ],
    validacao: (caso, documentos) => {
      const tiposNecessarios = [
        'requerimento_das',
        'documento_identificacao_responsavel',
        'contrato_social',
        'conta_energia',
        'extrato_bancario_corrente',
        'balancete_verificacao',
        'das_simples_nacional'
      ];
      
      const tiposPresentes = new Set(documentos.map(d => d.tipo_documento));
      const faltantes = tiposNecessarios.filter(t => !tiposPresentes.has(t));
      
      return {
        completo: faltantes.length === 0,
        progresso: ((tiposNecessarios.length - faltantes.length) / tiposNecessarios.length) * 100,
        faltantes
      };
    }
  },
  {
    id: 'analise_individual',
    titulo: 'Análise Individual',
    descricao: 'Aguarde a análise automática de cada documento',
    icone: Search,
    cor: 'purple',
    requisitos: [
      'Todos os documentos devem ser analisados',
      'Nenhum problema crítico detectado',
      'Score mínimo de 70 por documento'
    ],
    validacao: (caso, documentos, analise) => {
      if (!analise || !analise.individual || analise.individual.length === 0) {
        return {
          completo: false,
          progresso: 0,
          mensagem: 'Aguardando análise...'
        };
      }

      const totalDocs = documentos.length;
      const docsAnalisados = analise.individual.length;
      const docsCriticos = analise.individual.filter(a => 
        a.problemas.some(p => p.severidade === 'critico')
      ).length;
      const docsScore70 = analise.individual.filter(a => a.score >= 70).length;

      const completo = docsAnalisados === totalDocs && 
                       docsCriticos === 0 && 
                       docsScore70 === totalDocs;

      return {
        completo,
        progresso: (docsAnalisados / totalDocs) * 100,
        problemasCriticos: docsCriticos,
        documentosBaixoScore: totalDocs - docsScore70
      };
    }
  },
  {
    id: 'analise_cruzada',
    titulo: 'Análise Cruzada',
    descricao: 'Verificação de consistência entre documentos',
    icone: ClipboardCheck,
    cor: 'yellow',
    requisitos: [
      'Balancete vs. Extratos Bancários',
      'Contrato Social vs. Documentos de Sócios',
      'Consistência Cadastral (CNPJ/Razão Social)',
      'Coerência Temporal',
      'Comprovantes de Endereço vs. Cadastro'
    ],
    validacao: (caso, documentos, analise) => {
      if (!analise || !analise.cruzada) {
        return {
          completo: false,
          progresso: 0,
          mensagem: 'Aguardando análise individual...'
        };
      }

      const resumo = analise.cruzada.resumo;
      const inconsistenciasCriticas = resumo.inconsistencias_criticas || 0;
      const inconsistenciasAltas = resumo.inconsistencias_altas || 0;
      const score = resumo.score || 0;

      return {
        completo: inconsistenciasCriticas === 0 && score >= 80,
        progresso: score,
        inconsistenciasCriticas,
        inconsistenciasAltas,
        score
      };
    }
  },
  {
    id: 'protocolo',
    titulo: 'Protocolar',
    descricao: 'Enviar caso para análise da RFB',
    icone: Send,
    cor: 'green',
    requisitos: [
      'Todas as etapas anteriores concluídas',
      'Score geral ≥ 90',
      'Nenhuma inconsistência crítica'
    ],
    validacao: (caso, documentos, analise) => {
      if (!analise || !analise.cruzada) {
        return {
          completo: false,
          progresso: 0,
          mensagem: 'Complete as etapas anteriores'
        };
      }

      const score = analise.cruzada.resumo.score || 0;
      const inconsistenciasCriticas = analise.cruzada.resumo.inconsistencias_criticas || 0;
      const protocolado = caso.status === 'protocolado';

      return {
        completo: protocolado || (score >= 90 && inconsistenciasCriticas === 0),
        progresso: protocolado ? 100 : score,
        pronto: score >= 90 && inconsistenciasCriticas === 0,
        protocolado
      };
    }
  }
];

export default function ProcessoWizard({ caso, documentos = [], analise = null, onEtapaClick }) {
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [validacoes, setValidacoes] = useState({});

  // Valida todas as etapas
  useEffect(() => {
    const novasValidacoes = {};
    ETAPAS.forEach(etapa => {
      novasValidacoes[etapa.id] = etapa.validacao(caso, documentos, analise);
    });
    setValidacoes(novasValidacoes);

    // Avança automaticamente para primeira etapa incompleta
    const primeiraIncompleta = ETAPAS.findIndex(e => 
      !novasValidacoes[e.id]?.completo
    );
    if (primeiraIncompleta !== -1 && primeiraIncompleta !== etapaAtual) {
      setEtapaAtual(primeiraIncompleta);
    }
  }, [caso, documentos, analise]);

  // Calcula progresso geral
  const progressoGeral = ETAPAS.reduce((sum, etapa) => {
    const validacao = validacoes[etapa.id];
    return sum + (validacao?.progresso || 0);
  }, 0) / ETAPAS.length;

  const etapasCompletas = ETAPAS.filter(e => validacoes[e.id]?.completo).length;

  const proximaEtapa = () => {
    if (etapaAtual < ETAPAS.length - 1) {
      setEtapaAtual(etapaAtual + 1);
    }
  };

  const etapaAnterior = () => {
    if (etapaAtual > 0) {
      setEtapaAtual(etapaAtual - 1);
    }
  };

  const irParaEtapa = (index) => {
    setEtapaAtual(index);
  };

  const etapa = ETAPAS[etapaAtual];
  const validacao = validacoes[etapa.id] || {};
  const EtapaIcone = etapa.icone;

  return (
    <div className="space-y-6">
      {/* Progresso Geral */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Guia do Processo
            </CardTitle>
            <Badge variant="outline" className="text-lg px-4 py-1">
              {etapasCompletas}/{ETAPAS.length} Etapas
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Progresso Geral</span>
              <span className="font-bold text-gray-900">{Math.round(progressoGeral)}%</span>
            </div>
            <Progress value={progressoGeral} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Timeline de Etapas */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {ETAPAS.map((e, index) => {
              const val = validacoes[e.id] || {};
              const Icone = e.icone;
              const ativo = index === etapaAtual;
              const completo = val.completo;

              return (
                <React.Fragment key={e.id}>
                  <button
                    onClick={() => irParaEtapa(index)}
                    className={`flex flex-col items-center gap-2 transition-all ${
                      ativo ? 'scale-110' : 'scale-100 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${completo ? 'bg-green-100 border-2 border-green-500' :
                        ativo ? `bg-${e.cor}-100 border-2 border-${e.cor}-500` :
                        'bg-gray-100 border-2 border-gray-300'}
                    `}>
                      {completo ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <Icone className={`h-6 w-6 ${
                          ativo ? `text-${e.cor}-600` : 'text-gray-400'
                        }`} />
                      )}
                    </div>
                    <span className={`text-xs font-medium text-center max-w-[80px] ${
                      ativo ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      {e.titulo}
                    </span>
                  </button>

                  {index < ETAPAS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      validacoes[ETAPAS[index + 1].id]?.completo 
                        ? 'bg-green-500' 
                        : 'bg-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detalhes da Etapa Atual */}
      <Card className={`border-2 border-${etapa.cor}-300`}>
        <CardHeader className={`bg-${etapa.cor}-50`}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${etapa.cor}-100`}>
                <EtapaIcone className={`h-6 w-6 text-${etapa.cor}-600`} />
              </div>
              <div>
                <div className="text-xl">{etapa.titulo}</div>
                <div className="text-sm font-normal text-gray-600 mt-1">
                  {etapa.descricao}
                </div>
              </div>
            </CardTitle>
            {validacao.completo && (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Progresso da Etapa */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progresso desta Etapa
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {Math.round(validacao.progresso || 0)}%
                </span>
              </div>
              <Progress value={validacao.progresso || 0} className="h-2" />
            </div>

            {/* Requisitos */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Requisitos:
              </h4>
              <div className="space-y-2">
                {etapa.requisitos.map((req, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    {validacao.completo ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="text-sm text-gray-700">{req}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mensagens Específicas */}
            {validacao.mensagem && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">{validacao.mensagem}</p>
              </div>
            )}

            {validacao.problemasCriticos > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    {validacao.problemasCriticos} problema(s) crítico(s) detectado(s)
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Corrija os problemas críticos antes de prosseguir
                  </p>
                </div>
              </div>
            )}

            {validacao.inconsistenciasCriticas > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    {validacao.inconsistenciasCriticas} inconsistência(s) crítica(s) entre documentos
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Resolva as inconsistências antes de protocolar
                  </p>
                </div>
              </div>
            )}

            {validacao.pronto && !validacao.protocolado && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Tudo pronto para protocolar!
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Documentação completa e aprovada
                  </p>
                </div>
              </div>
            )}

            {validacao.protocolado && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Caso protocolado com sucesso!
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Aguarde análise da RFB
                  </p>
                </div>
              </div>
            )}

            {/* Botão de Ação */}
            {onEtapaClick && !validacao.completo && (
              <Button
                onClick={() => onEtapaClick(etapa.id)}
                className="w-full gap-2"
                size="lg"
              >
                <EtapaIcone className="h-5 w-5" />
                {etapa.id === 'documentos' && 'Enviar Documentos'}
                {etapa.id === 'analise_individual' && 'Ver Análise Individual'}
                {etapa.id === 'analise_cruzada' && 'Ver Análise Cruzada'}
                {etapa.id === 'protocolo' && 'Protocolar Caso'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navegação */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={etapaAnterior}
          disabled={etapaAtual === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        <span className="text-sm text-gray-600">
          Etapa {etapaAtual + 1} de {ETAPAS.length}
        </span>

        <Button
          variant="outline"
          onClick={proximaEtapa}
          disabled={etapaAtual === ETAPAS.length - 1}
          className="gap-2"
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
