import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, AlertTriangle, Lightbulb, Loader2, Shield, ArrowRight, Zap } from 'lucide-react';
import { crossDocumentRules, executarAnaliseCruzada } from './validators/crossDocumentAnalysis';
import { gerarSugestoesParaDiscrepancia } from './validators/suggestionsEngine';

export default function AnaliseCruzadaPanel({ documentos = [], cliente = {} }) {
  const [analisandoCruzada, setAnalisandoCruzada] = useState(false);
  const [resultadosCruzada, setResultadosCruzada] = useState(null);
  const [regraAtiva, setRegraAtiva] = useState(null);

  const regrasDisponiveis = [
    { id: 'procuracao_vs_doc_procurador', nome: 'Procuração vs Procurador', descricao: 'Validar nome do procurador', icon: '01', cor: 'blue' },
    { id: 'contrato_social_vs_certidao', nome: 'Contrato vs Junta Comercial', descricao: 'CNPJ, razão social e sócios', icon: '02', cor: 'violet' },
    { id: 'balancete_vs_extratos', nome: 'Balancete vs Extratos', descricao: 'Reconciliar saldos de caixa', icon: '03', cor: 'emerald' },
    { id: 'mutuo_vs_iof', nome: 'Mútuo vs IOF', descricao: 'Validar recolhimento de IOF', icon: '04', cor: 'amber' },
    { id: 'domicilio_vs_cnpj', nome: 'Endereço vs CNPJ', descricao: 'Verificar endereço cadastral', icon: '05', cor: 'rose' }
  ];

  const analisarCruzada = async (regraId) => {
    setAnalisandoCruzada(true);
    setRegraAtiva(regraId);
    try {
      const regra = crossDocumentRules[regraId];
      if (!regra) throw new Error('Regra não encontrada');

      let resultado = {};
      switch (regraId) {
        case 'procuracao_vs_doc_procurador':
          resultado = executarAnaliseCruzada(documentos, 'procuracao', 'documento_identificacao_procurador', regra);
          break;
        case 'contrato_social_vs_certidao':
          resultado = executarAnaliseCruzada(documentos, 'contrato_social', 'certidao_junta_comercial', regra);
          break;
        case 'balancete_vs_extratos':
          const balancete = documentos.find(d => d.tipo_documento?.includes('balancete'));
          const extratos = documentos.filter(d => d.tipo_documento?.includes('extrato'));
          resultado = regra.validar(balancete, extratos);
          break;
        case 'mutuo_vs_iof':
          resultado = executarAnaliseCruzada(documentos, 'contrato_mutuo', 'comprovante_iof', regra);
          break;
        case 'domicilio_vs_cnpj':
          const docDomicilio = documentos.find(d =>
            d.tipo_documento?.includes('energia') || d.tipo_documento?.includes('internet') || d.tipo_documento?.includes('iptu')
          );
          resultado = regra.validar(docDomicilio, cliente);
          break;
        default:
          throw new Error('Regra desconhecida');
      }

      setResultadosCruzada({ regraId, regraNome: regrasDisponiveis.find(r => r.id === regraId)?.nome, ...resultado });
    } catch (error) {
      setResultadosCruzada({ regraId, passado: false, aviso: 'Erro ao executar análise: ' + error.message });
    } finally {
      setAnalisandoCruzada(false);
      setRegraAtiva(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-violet-50/80 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Análise Cruzada de Documentos</h3>
              <p className="text-xs text-slate-500">Validação de consistência entre diferentes documentos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {regrasDisponiveis.map(regra => (
              <button
                key={regra.id}
                onClick={() => analisarCruzada(regra.id)}
                disabled={analisandoCruzada}
                className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:shadow-lg hover:shadow-slate-100/50 hover:-translate-y-0.5 ${
                  analisandoCruzada && regraAtiva === regra.id
                    ? 'border-violet-200 bg-violet-50'
                    : 'border-slate-100 bg-white hover:border-violet-100'
                }`}
              >
                <div className="absolute top-2 right-2 text-[40px] font-black text-slate-100 group-hover:text-violet-100 transition-colors leading-none">
                  {regra.icon}
                </div>
                <div className="relative">
                  <h4 className="font-semibold text-sm text-slate-900 mb-1 pr-8">{regra.nome}</h4>
                  <p className="text-xs text-slate-500">{regra.descricao}</p>
                  {analisandoCruzada && regraAtiva === regra.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-violet-500 mt-2" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resultados */}
      {resultadosCruzada && (
        <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
          resultadosCruzada.passado
            ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
            : resultadosCruzada.passado === false
              ? 'border-red-200 bg-gradient-to-br from-red-50 to-white'
              : 'border-amber-200 bg-gradient-to-br from-amber-50 to-white'
        }`}>
          {/* Result Header */}
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {resultadosCruzada.passado ? (
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                ) : resultadosCruzada.passado === false ? (
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-slate-900">{resultadosCruzada.regraNome}</h4>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {resultadosCruzada.passado ? 'Validação aprovada' :
                     resultadosCruzada.passado === false ? 'Inconsistências encontradas' : 'Aviso'}
                  </p>
                </div>
              </div>
              <Badge className={`text-xs ${
                resultadosCruzada.passado ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                resultadosCruzada.passado === false ? 'bg-red-100 text-red-700 border-red-200' :
                'bg-amber-100 text-amber-700 border-amber-200'
              }`} variant="outline">
                {resultadosCruzada.passado ? 'APROVADO' : 'INCONSISTENTE'}
              </Badge>
            </div>

            {resultadosCruzada.aviso && (
              <p className="text-sm text-slate-600 mt-3 ml-13">{resultadosCruzada.aviso}</p>
            )}

            {/* Divergências */}
            {(resultadosCruzada.erros || resultadosCruzada.discrepancias)?.length > 0 && (
              <div className="mt-4 space-y-2">
                <h5 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-500" />
                  Divergências Encontradas
                </h5>
                {(resultadosCruzada.erros || resultadosCruzada.discrepancias).map((err, idx) => {
                  const sugestoes = gerarSugestoesParaDiscrepancia('documento_faltante', err);
                  return (
                    <div key={idx} className="rounded-xl bg-white border border-slate-100 p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">
                            <strong>{err.campo || err.banco}:</strong> {err.valor1} <ArrowRight className="h-3 w-3 inline mx-1" /> {err.valor2}
                          </p>
                          {err.severidade && (
                            <Badge className={`mt-1 text-[10px] ${
                              err.severidade === 'critica' ? 'bg-red-50 text-red-700 border-red-200' :
                              err.severidade === 'media' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            }`} variant="outline">
                              {err.severidade.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {sugestoes?.passos && (
                        <div className="ml-6 mt-2 p-3 bg-amber-50/80 rounded-lg border border-amber-100">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-1.5">
                            <Lightbulb className="h-3.5 w-3.5" />
                            Sugestão de Correção
                          </div>
                          {sugestoes.passos.map((passo, i) => (
                            <p key={i} className="text-xs text-slate-600 ml-5 leading-relaxed">{passo}</p>
                          ))}
                          {sugestoes.acao && (
                            <p className="text-xs text-amber-700 font-semibold mt-2 ml-5 flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" /> {sugestoes.acao}
                            </p>
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
              <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-100">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">{resultadosCruzada.sugestao}</p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setResultadosCruzada(null)} className="rounded-xl text-xs">
                Fechar Resultado
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
