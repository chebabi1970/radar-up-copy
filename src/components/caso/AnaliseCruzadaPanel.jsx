import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { crossDocumentRules, executarAnaliseCruzada } from './validators/crossDocumentAnalysis';
import { gerarSugestoesParaDiscrepancia } from './validators/suggestionsEngine';

export default function AnaliseCruzadaPanel({ documentos = [], cliente = {} }) {
  const [analisandoCruzada, setAnalisandoCruzada] = useState(false);
  const [resultadosCruzada, setResultadosCruzada] = useState(null);

  const regrasDisponiveis = [
    {
      id: 'procuracao_vs_doc_procurador',
      nome: 'Procuração ↔ Documento Procurador',
      descricao: 'Validar se nome do procurador coincide'
    },
    {
      id: 'contrato_social_vs_certidao',
      nome: 'Contrato Social ↔ Junta Comercial',
      descricao: 'Verificar CNPJ, razão social e sócios'
    },
    {
      id: 'balancete_vs_extratos',
      nome: 'Balancete ↔ Extratos Bancários',
      descricao: 'Reconciliar saldos de caixa'
    },
    {
      id: 'mutuo_vs_iof',
      nome: 'Mútuo ↔ IOF',
      descricao: 'Validar recolhimento de IOF'
    },
    {
      id: 'domicilio_vs_cnpj',
      nome: 'Comprovante Domicílio ↔ CNPJ',
      descricao: 'Verificar endereço'
    }
  ];

  const analisarCruzada = async (regraId) => {
    setAnalisandoCruzada(true);
    try {
      const regra = crossDocumentRules[regraId];
      if (!regra) throw new Error('Regra não encontrada');

      let resultado = {};

      switch (regraId) {
        case 'procuracao_vs_doc_procurador':
          resultado = executarAnaliseCruzada(
            documentos,
            'procuracao',
            'documento_identificacao_procurador',
            regra
          );
          break;

        case 'contrato_social_vs_certidao':
          resultado = executarAnaliseCruzada(
            documentos,
            'contrato_social',
            'certidao_junta_comercial',
            regra
          );
          break;

        case 'balancete_vs_extratos':
          const balancete = documentos.find(d => d.tipo_documento?.includes('balancete'));
          const extratos = documentos.filter(d => d.tipo_documento?.includes('extrato'));
          resultado = regra.validar(balancete, extratos);
          break;

        case 'mutuo_vs_iof':
          resultado = executarAnaliseCruzada(
            documentos,
            'contrato_mutuo',
            'comprovante_iof',
            regra
          );
          break;

        case 'domicilio_vs_cnpj':
          const docDomicilio = documentos.find(d => 
            d.tipo_documento?.includes('energia') || 
            d.tipo_documento?.includes('internet') ||
            d.tipo_documento?.includes('iptu')
          );
          resultado = regra.validar(docDomicilio, cliente);
          break;

        default:
          throw new Error('Regra desconhecida');
      }

      setResultadosCruzada({
        regraId,
        regraNome: regrasDisponiveis.find(r => r.id === regraId)?.nome,
        ...resultado
      });
    } catch (error) {
      console.error('Erro na análise cruzada:', error);
      setResultadosCruzada({
        regraId,
        passado: false,
        aviso: 'Erro ao executar análise: ' + error.message
      });
    } finally {
      setAnalisandoCruzada(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Análise Cruzada de Documentos</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Validação de consistência entre diferentes documentos</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {regrasDisponiveis.map(regra => (
              <Button
                key={regra.id}
                variant="outline"
                onClick={() => analisarCruzada(regra.id)}
                disabled={analisandoCruzada}
                className="h-auto p-3 justify-start text-left hover:bg-blue-50"
              >
                <div className="flex-1">
                  <div className="font-semibold text-sm">{regra.nome}</div>
                  <div className="text-xs text-slate-500 mt-1">{regra.descricao}</div>
                </div>
                {analisandoCruzada && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {resultadosCruzada && (
        <Card className={
          resultadosCruzada.passado 
            ? 'border-2 border-green-300 bg-green-50' 
            : resultadosCruzada.passado === false
            ? 'border-2 border-red-300 bg-red-50'
            : 'border-2 border-yellow-300 bg-yellow-50'
        }>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {resultadosCruzada.passado ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                ) : resultadosCruzada.passado === false ? (
                  <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <CardTitle className="text-base">{resultadosCruzada.regraNome}</CardTitle>
                  <p className="text-sm mt-1">
                    {resultadosCruzada.passado ? 'Validação passou' : 
                     resultadosCruzada.passado === false ? 'Validação falhou' : 
                     'Aviso'}
                  </p>
                </div>
              </div>
              <Badge className={
                resultadosCruzada.passado 
                  ? 'bg-green-100 text-green-800' 
                  : resultadosCruzada.passado === false
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }>
                {resultadosCruzada.passado ? 'OK' : 'INCONSISTÊNCIA'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {resultadosCruzada.aviso && (
              <p className="text-sm text-slate-600">{resultadosCruzada.aviso}</p>
            )}

            {/* Erros/Divergências */}
            {(resultadosCruzada.erros || resultadosCruzada.discrepancias)?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 text-sm">Divergências Encontradas:</h4>
                {(resultadosCruzada.erros || resultadosCruzada.discrepancias).map((err, idx) => {
                  const sugestoes = gerarSugestoesParaDiscrepancia('documento_faltante', err);
                  
                  return (
                    <div key={idx} className="p-3 bg-white/80 rounded border border-slate-200 space-y-2">
                      <p className="text-sm">
                        <strong>{err.campo || err.banco}:</strong> {err.valor1} ≠ {err.valor2}
                      </p>
                      {err.severidade && (
                        <Badge className={
                          err.severidade === 'critica' ? 'bg-red-100 text-red-800' :
                          err.severidade === 'media' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {err.severidade.toUpperCase()}
                        </Badge>
                      )}
                      
                      {/* Sugestão de Correção */}
                      {sugestoes?.passos && (
                        <div className="mt-2 p-2 bg-amber-50 rounded-lg border-l-2 border-amber-300 text-xs space-y-1">
                          <div className="flex items-center gap-1 font-semibold text-amber-700">
                            <Lightbulb className="h-3 w-3" />
                            Sugestão de Correção
                          </div>
                          {sugestoes.passos.map((passo, i) => (
                            <p key={i} className="text-slate-600 ml-4">{passo}</p>
                          ))}
                          {sugestoes.acao && (
                            <p className="text-amber-700 font-semibold mt-2">→ {sugestoes.acao}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sugestão geral */}
            {resultadosCruzada.sugestao && (
              <div className="p-3 bg-amber-50 rounded-lg border-l-2 border-amber-300 text-sm">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-700">{resultadosCruzada.sugestao}</p>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setResultadosCruzada(null)}
            >
              Fechar
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}