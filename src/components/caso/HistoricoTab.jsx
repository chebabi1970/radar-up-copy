import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tipoAnaliseLabels = {
  balancete_vs_extrato: 'Balancete vs Extrato',
  validacao_documento: 'Validação de Documento',
  analise_customizada: 'Análise Customizada'
};

const statusResultadoLabels = {
  sem_discrepancias: 'Sem Discrepâncias',
  com_discrepancias: 'Com Discrepâncias',
  erro: 'Erro'
};

const statusColors = {
  sem_discrepancias: 'bg-green-100 text-green-800 border-green-200',
  com_discrepancias: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  erro: 'bg-red-100 text-red-800 border-red-200'
};

export default function HistoricoTab({ casoId }) {
  const [expandedItem, setExpandedItem] = useState(null);
  const [detailsModal, setDetailsModal] = useState(null);

  const { data: historico = [], isLoading } = useQuery({
    queryKey: ['historico', casoId],
    queryFn: () => base44.entities.AnaliseHistorico.filter(
      { caso_id: casoId },
      '-created_date'
    )
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Carregando histórico...
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
        <p>Nenhuma análise registrada ainda</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">
            Histórico de Análises
          </h3>
          <Badge variant="outline" className="text-xs">
            {historico.length} análise{historico.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {historico.map((item) => (
          <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">
                        {tipoAnaliseLabels[item.tipo_analise]}
                      </h4>
                      <Badge className={`${statusColors[item.status_resultado]} border`}>
                        {statusResultadoLabels[item.status_resultado]}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {item.documento_nome}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDetailsModal(item)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    Ver Detalhes
                  </Button>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2 bg-slate-50 rounded text-xs">
                    <p className="text-slate-500 mb-0.5">Data/Hora</p>
                    <p className="font-semibold text-slate-900">
                      {format(new Date(item.data_hora_analise), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded text-xs">
                    <p className="text-slate-500 mb-0.5">Usuário</p>
                    <p className="font-semibold text-slate-900 truncate" title={item.usuario_email}>
                      {item.usuario_email?.split('@')[0]}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded text-xs">
                    <p className="text-slate-500 mb-0.5">Total</p>
                    <p className="font-semibold text-slate-900">
                      {item.total_discrepancias} discrepância(s)
                    </p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded text-xs">
                    <p className="text-slate-500 mb-0.5">Criadas</p>
                    <p className="font-semibold text-slate-900">
                      {format(new Date(item.created_date), 'dd/MM/yy', { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* Discrepâncias Summary */}
                {item.total_discrepancias > 0 && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <p className="text-red-600 font-semibold">{item.discrepancias_criticas}</p>
                        <p className="text-slate-600">Críticas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-yellow-600 font-semibold">{item.discrepancias_medias}</p>
                        <p className="text-slate-600">Médias</p>
                      </div>
                      <div className="text-center">
                        <p className="text-blue-600 font-semibold">{item.discrepancias_leves}</p>
                        <p className="text-slate-600">Leves</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Observações */}
                {item.observacoes && (
                  <div className="p-2 bg-blue-50 rounded text-sm text-blue-800 border border-blue-100">
                    {item.observacoes}
                  </div>
                )}

                {/* Status Message */}
                {item.status_resultado === 'com_discrepancias' && item.total_discrepancias > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-yellow-800">
                      <p className="font-semibold mb-0.5">Ação Recomendada</p>
                      <p>Revisar as discrepâncias encontradas e tomar as medidas necessárias.</p>
                    </div>
                  </div>
                )}

                {item.status_resultado === 'sem_discrepancias' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-green-800">
                      <p className="font-semibold">Análise Aprovada</p>
                      <p>Não foram encontradas discrepâncias nesta análise.</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Detalhes */}
      {detailsModal && (
        <Dialog open={!!detailsModal} onOpenChange={() => setDetailsModal(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span>{tipoAnaliseLabels[detailsModal.tipo_analise]}</span>
                <Badge className={`${statusColors[detailsModal.status_resultado]} border`}>
                  {statusResultadoLabels[detailsModal.status_resultado]}
                </Badge>
              </DialogTitle>
              <p className="text-sm text-slate-600 mt-2">{detailsModal.documento_nome}</p>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Informações Gerais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Data e Hora</p>
                  <p className="font-semibold text-slate-900">
                    {format(new Date(detailsModal.data_hora_analise), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Realizada por</p>
                  <p className="font-semibold text-slate-900">{detailsModal.usuario_email}</p>
                </div>
              </div>

              {/* Resumo de Discrepâncias */}
              {detailsModal.total_discrepancias > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-3">Resumo de Discrepâncias</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-900">{detailsModal.total_discrepancias}</p>
                      <p className="text-xs text-slate-600">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{detailsModal.discrepancias_criticas}</p>
                      <p className="text-xs text-slate-600">Críticas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{detailsModal.discrepancias_medias}</p>
                      <p className="text-xs text-slate-600">Médias</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{detailsModal.discrepancias_leves}</p>
                      <p className="text-xs text-slate-600">Leves</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Detalhes Completos da Análise */}
              {detailsModal.dados_completos && (
                <div className="space-y-4">
                  {/* Para análise de validação de documento */}
                  {detailsModal.tipo_analise === 'validacao_documento' && detailsModal.dados_completos.dados && (
                    <>
                      {/* Classificação Final */}
                      {detailsModal.dados_completos.dados.classificacao_final && (
                        <div className={`p-4 rounded-lg border-2 ${
                          detailsModal.dados_completos.dados.classificacao_final === 'APROVADO' 
                            ? 'bg-green-50 border-green-300' 
                            : detailsModal.dados_completos.dados.classificacao_final === 'APROVADO_COM_RESSALVAS'
                            ? 'bg-yellow-50 border-yellow-300'
                            : 'bg-red-50 border-red-300'
                        }`}>
                          <h4 className="font-bold text-lg mb-2">
                            {detailsModal.dados_completos.dados.classificacao_final.replace(/_/g, ' ')}
                          </h4>
                          {detailsModal.dados_completos.dados.resumo && (
                            <p className="text-sm">{detailsModal.dados_completos.dados.resumo}</p>
                          )}
                        </div>
                      )}

                      {/* Checklist */}
                      {detailsModal.dados_completos.dados.checklist_verificacao?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3">✓ Checklist de Verificação</h4>
                          <div className="space-y-2">
                            {detailsModal.dados_completos.dados.checklist_verificacao.map((check, idx) => (
                              <div key={idx} className={`p-3 rounded-lg border ${
                                check.status === 'OK' 
                                  ? 'bg-green-50 border-green-200' 
                                  : check.status === 'ALERTA'
                                  ? 'bg-yellow-50 border-yellow-200'
                                  : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="flex items-start gap-2">
                                  <span className="text-lg">
                                    {check.status === 'OK' ? '✅' : check.status === 'ALERTA' ? '⚠️' : '❌'}
                                  </span>
                                  <div className="flex-1">
                                    <p className="font-semibold text-sm">{check.item}</p>
                                    {check.observacao && <p className="text-xs text-slate-600 mt-1">{check.observacao}</p>}
                                  </div>
                                  <Badge className={
                                    check.status === 'OK' 
                                      ? 'bg-green-100 text-green-800' 
                                      : check.status === 'ALERTA'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }>
                                    {check.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Indicadores de Alerta */}
                      {detailsModal.dados_completos.dados.indicadores_alerta?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3">🚨 Indicadores de Alerta</h4>
                          <div className="space-y-2">
                            {detailsModal.dados_completos.dados.indicadores_alerta.map((alerta, idx) => (
                              <div key={idx} className={`p-3 rounded-lg border ${
                                alerta.severidade === 'critica' 
                                  ? 'bg-red-50 border-red-300' 
                                  : alerta.severidade === 'media'
                                  ? 'bg-yellow-50 border-yellow-300'
                                  : 'bg-blue-50 border-blue-300'
                              }`}>
                                <div className="flex items-start gap-3">
                                  <span className="text-2xl">
                                    {alerta.severidade === 'critica' ? '🔴' : alerta.severidade === 'media' ? '🟡' : '🟠'}
                                  </span>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-bold text-sm">{alerta.tipo}</p>
                                      <Badge className={
                                        alerta.severidade === 'critica' 
                                          ? 'bg-red-600 text-white' 
                                          : alerta.severidade === 'media'
                                          ? 'bg-yellow-600 text-white'
                                          : 'bg-blue-600 text-white'
                                      }>
                                        {alerta.severidade.toUpperCase()}
                                      </Badge>
                                    </div>
                                    <p className="text-sm mb-2">{alerta.descricao}</p>
                                    {alerta.fundamento_normativo && (
                                      <p className="text-xs text-slate-500 italic">
                                        Base legal: {alerta.fundamento_normativo}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Validações com Cadastro */}
                      {detailsModal.dados_completos.dados.validacoes_cadastro?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3">🔍 Validações com Cadastro</h4>
                          <div className="space-y-2">
                            {detailsModal.dados_completos.dados.validacoes_cadastro.map((val, idx) => (
                              <div key={idx} className={`p-3 rounded-lg border ${
                                val.coincide ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="flex items-start gap-2">
                                  <span className="text-lg">{val.coincide ? '✅' : '❌'}</span>
                                  <div className="flex-1 text-sm">
                                    <p className="font-semibold">{val.campo}</p>
                                    <p className="text-slate-600 mt-1">
                                      <span className="font-medium">Documento:</span> {val.valor_documento}
                                    </p>
                                    <p className="text-slate-600">
                                      <span className="font-medium">Cadastro:</span> {val.valor_cadastro}
                                    </p>
                                    {!val.coincide && (
                                      <p className="text-red-700 font-semibold mt-1">⚠ INCONSISTÊNCIA DETECTADA</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Verificações Cruzadas */}
                      {detailsModal.dados_completos.dados.verificacoes_cruzadas_necessarias?.length > 0 && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-2">🔗 Verificações Cruzadas Recomendadas</h4>
                          <ul className="text-sm text-blue-800 space-y-2">
                            {detailsModal.dados_completos.dados.verificacoes_cruzadas_necessarias.map((verif, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span>→</span>
                                <div>
                                  <p className="font-semibold">{verif.documento_relacionado}</p>
                                  <p className="text-xs mt-0.5">{verif.o_que_verificar}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}

                  {/* Para análise balancete vs extrato */}
                  {detailsModal.tipo_analise === 'balancete_vs_extrato' && detailsModal.dados_completos.discrepancias && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Discrepâncias Encontradas</h4>
                      {detailsModal.dados_completos.discrepancias.length > 0 ? (
                        <div className="space-y-2">
                          {detailsModal.dados_completos.discrepancias.map((disc, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border ${
                              disc.severidade === 'critica'
                                ? 'bg-red-50 border-red-200'
                                : disc.severidade === 'media'
                                ? 'bg-yellow-50 border-yellow-200'
                                : 'bg-blue-50 border-blue-200'
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-sm flex-1">
                                  <p className="font-semibold text-slate-900">{disc.banco}</p>
                                  <p className="text-xs text-slate-600">Conta: {disc.conta}</p>
                                  <p className="text-xs text-slate-600">Período: {disc.periodo}</p>
                                  <div className="mt-2 space-y-0.5 text-xs">
                                    <p>Balancete: <strong>R$ {disc.saldo_balancete?.toLocaleString('pt-BR')}</strong></p>
                                    <p>Extrato: <strong>R$ {disc.saldo_extrato?.toLocaleString('pt-BR')}</strong></p>
                                    <p className="text-red-600">Diferença: <strong>R$ {disc.diferenca?.toLocaleString('pt-BR')}</strong></p>
                                  </div>
                                </div>
                                <Badge className={
                                  disc.severidade === 'critica'
                                    ? 'bg-red-100 text-red-800'
                                    : disc.severidade === 'media'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-blue-100 text-blue-800'
                                }>
                                  {disc.severidade}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">Nenhuma discrepância encontrada.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Observações */}
              {detailsModal.observacoes && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Observações</h4>
                  <p className="text-sm text-blue-800">{detailsModal.observacoes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}