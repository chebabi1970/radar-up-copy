import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  FileText,
  Clock,
  AlertCircle,
  Shield,
  Activity
} from 'lucide-react';

export default function DashboardConformidade({ caso, checklistItems, documentos, analisesHistorico }) {
  // Calcular métricas
  const metricas = useMemo(() => {
    // Checklist
    const totalItens = checklistItems.length;
    const aprovados = checklistItems.filter(i => i.status === 'aprovado').length;
    const pendentes = checklistItems.filter(i => i.status === 'pendente').length;
    const enviados = checklistItems.filter(i => i.status === 'enviado').length;
    const progressoChecklist = totalItens > 0 ? Math.round((aprovados / totalItens) * 100) : 0;

    // Documentos
    const totalDocs = documentos.length;
    const docsAprovados = documentos.filter(d => d.status_analise === 'aprovado').length;
    const docsReprovados = documentos.filter(d => d.status_analise === 'reprovado').length;
    const docsPendentes = documentos.filter(d => d.status_analise === 'pendente').length;

    // Análises
    const totalAnalises = analisesHistorico?.length || 0;
    const analisesCriticas = analisesHistorico?.filter(a => a.discrepancias_criticas > 0).length || 0;
    const analisesSemProblemas = analisesHistorico?.filter(a => a.status_resultado === 'sem_discrepancias').length || 0;

    // Score de conformidade (0-100)
    let score = 0;
    if (totalItens > 0) score += (aprovados / totalItens) * 40; // 40% peso checklist
    if (totalDocs > 0) score += (docsAprovados / totalDocs) * 30; // 30% peso docs
    if (totalAnalises > 0) score += (analisesSemProblemas / totalAnalises) * 30; // 30% peso análises
    score = Math.round(score);

    // Status geral
    let statusGeral = 'pendente';
    let corStatus = 'text-slate-600';
    if (score >= 80) {
      statusGeral = 'apto';
      corStatus = 'text-green-600';
    } else if (score >= 50) {
      statusGeral = 'em_progresso';
      corStatus = 'text-yellow-600';
    } else if (analisesCriticas > 0 || docsReprovados > 0) {
      statusGeral = 'critico';
      corStatus = 'text-red-600';
    }

    return {
      checklist: { totalItens, aprovados, pendentes, enviados, progressoChecklist },
      documentos: { totalDocs, docsAprovados, docsReprovados, docsPendentes },
      analises: { totalAnalises, analisesCriticas, analisesSemProblemas },
      score,
      statusGeral,
      corStatus
    };
  }, [checklistItems, documentos, analisesHistorico]);

  // Alertas críticos
  const alertasCriticos = useMemo(() => {
    const alertas = [];
    
    // Checklist incompleto
    if (metricas.checklist.pendentes > 5) {
      alertas.push({
        tipo: 'checklist',
        severidade: 'media',
        mensagem: `${metricas.checklist.pendentes} itens pendentes no checklist`
      });
    }

    // Documentos reprovados
    if (metricas.documentos.docsReprovados > 0) {
      alertas.push({
        tipo: 'documentos',
        severidade: 'critica',
        mensagem: `${metricas.documentos.docsReprovados} documentos reprovados`
      });
    }

    // Análises com problemas críticos
    if (metricas.analises.analisesCriticas > 0) {
      alertas.push({
        tipo: 'analises',
        severidade: 'critica',
        mensagem: `${metricas.analises.analisesCriticas} análises com discrepâncias críticas`
      });
    }

    // Nenhum documento analisado
    if (metricas.analises.totalAnalises === 0 && metricas.documentos.totalDocs > 0) {
      alertas.push({
        tipo: 'analises',
        severidade: 'media',
        mensagem: 'Nenhuma análise realizada ainda'
      });
    }

    return alertas;
  }, [metricas]);

  return (
    <div className="space-y-4">
      {/* Score de Conformidade */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg mb-1">Score de Conformidade</CardTitle>
              <p className="text-xs text-slate-500">Avaliação geral do caso</p>
            </div>
            <div className="h-16 w-16 rounded-full bg-white border-4 border-blue-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">{metricas.score}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={metricas.score} className="h-3 mb-2" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Status:</span>
            <Badge className={`${metricas.corStatus} bg-opacity-10`}>
              {metricas.statusGeral === 'apto' && '✓ Apto para Protocolo'}
              {metricas.statusGeral === 'em_progresso' && '⚠ Em Progresso'}
              {metricas.statusGeral === 'critico' && '✗ Crítico - Atenção Necessária'}
              {metricas.statusGeral === 'pendente' && '○ Pendente'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Checklist */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-xs text-slate-500">Checklist</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-slate-900">
                {metricas.checklist.progressoChecklist}%
              </div>
              <div className="text-xs text-slate-600">
                {metricas.checklist.aprovados}/{metricas.checklist.totalItens} itens
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documentos */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-xs text-slate-500">Documentos</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-slate-900">
                {metricas.documentos.totalDocs}
              </div>
              <div className="text-xs text-slate-600">
                {metricas.documentos.docsAprovados} aprovados
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Análises */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-xs text-slate-500">Análises</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-slate-900">
                {metricas.analises.totalAnalises}
              </div>
              <div className="text-xs text-slate-600">
                {metricas.analises.analisesSemProblemas} sem problemas
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Qualidade */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-xs text-slate-500">Qualidade</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-slate-900">
                {metricas.analises.analisesCriticas === 0 ? '✓' : '!'}
              </div>
              <div className="text-xs text-slate-600">
                {metricas.analises.analisesCriticas} críticas
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Críticos */}
      {alertasCriticos.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Alertas Críticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertasCriticos.map((alerta, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg flex items-start gap-2 text-xs ${
                  alerta.severidade === 'critica'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}
              >
                {alerta.severidade === 'critica' ? (
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <Badge
                    className={`text-xs mb-1 ${
                      alerta.severidade === 'critica'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {alerta.tipo}
                  </Badge>
                  <p className="text-slate-700">{alerta.mensagem}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detalhamento por categoria */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Detalhamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Checklist</span>
              <span className="text-slate-500">{metricas.checklist.progressoChecklist}%</span>
            </div>
            <Progress value={metricas.checklist.progressoChecklist} className="h-2" />
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-slate-600">{metricas.checklist.aprovados} aprovados</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="text-slate-600">{metricas.checklist.enviados} enviados</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                <span className="text-slate-600">{metricas.checklist.pendentes} pendentes</span>
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Documentos</span>
              <span className="text-slate-500">
                {metricas.documentos.totalDocs > 0
                  ? Math.round((metricas.documentos.docsAprovados / metricas.documentos.totalDocs) * 100)
                  : 0}
                %
              </span>
            </div>
            <Progress
              value={
                metricas.documentos.totalDocs > 0
                  ? (metricas.documentos.docsAprovados / metricas.documentos.totalDocs) * 100
                  : 0
              }
              className="h-2"
            />
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-slate-600">{metricas.documentos.docsAprovados} aprovados</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                <span className="text-slate-600">{metricas.documentos.docsReprovados} reprovados</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                <span className="text-slate-600">{metricas.documentos.docsPendentes} pendentes</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}