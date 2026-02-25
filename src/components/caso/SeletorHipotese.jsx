/**
 * Seletor de Hipótese de Revisão
 * Permite selecionar e alterar a hipótese do caso
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getAllHipoteses, getHipoteseInfo } from '@/config/documentosPorHipotese';

export default function SeletorHipotese({ 
  hipoteseAtual, 
  onMudarHipotese,
  bloqueado = false 
}) {
  const [hipoteseSelecionada, setHipoteseSelecionada] = useState(hipoteseAtual);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  
  const hipoteses = getAllHipoteses();
  const infoAtual = getHipoteseInfo(hipoteseAtual);
  const infoSelecionada = getHipoteseInfo(hipoteseSelecionada);

  const handleSelecionarHipotese = (novaHipotese) => {
    if (novaHipotese === hipoteseAtual) {
      return;
    }
    
    setHipoteseSelecionada(novaHipotese);
    setMostrarConfirmacao(true);
  };

  const confirmarMudanca = () => {
    onMudarHipotese(hipoteseSelecionada);
    setMostrarConfirmacao(false);
  };

  const cancelarMudanca = () => {
    setHipoteseSelecionada(hipoteseAtual);
    setMostrarConfirmacao(false);
  };

  return (
    <>
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Hipótese de Revisão
          </CardTitle>
          <CardDescription>
            Selecione a hipótese que justifica o pedido de revisão conforme Portaria Coana 72/2020
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Hipótese Atual */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="bg-blue-600">
                      Hipótese {infoAtual?.codigo}
                    </Badge>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <h3 className="font-semibold text-blue-900">{infoAtual?.nome}</h3>
                </div>
              </div>
              <p className="text-sm text-blue-700 mb-2">{infoAtual?.descricao}</p>
              <p className="text-xs text-blue-600">{infoAtual?.artigo}</p>
            </div>

            {/* Seletor de Nova Hipótese */}
            {!bloqueado && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Alterar Hipótese
                </label>
                <Select
                  value={hipoteseAtual}
                  onValueChange={handleSelecionarHipotese}
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
                            {hip.descricao}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  ⚠️ Ao mudar a hipótese, a lista de documentos será atualizada automaticamente
                </p>
              </div>
            )}

            {bloqueado && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  A hipótese não pode ser alterada após o protocolo do caso.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <AlertDialog open={mostrarConfirmacao} onOpenChange={setMostrarConfirmacao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirmar Mudança de Hipótese
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a alterar a hipótese de revisão de:
              </p>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">
                  <span className="text-red-600">De:</span> Hipótese {infoAtual?.codigo} - {infoAtual?.nome}
                </p>
                <p className="font-medium text-gray-900 mt-2">
                  <span className="text-green-600">Para:</span> Hipótese {infoSelecionada?.codigo} - {infoSelecionada?.nome}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ Importante:
                </p>
                <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                  <li>A lista de documentos será atualizada</li>
                  <li>Você precisará revisar quais documentos são obrigatórios</li>
                  <li>As análises já realizadas permanecerão, mas podem não ser mais aplicáveis</li>
                </ul>
              </div>
              <p className="text-sm">
                Deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelarMudanca}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmarMudanca}>
              Confirmar Mudança
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
