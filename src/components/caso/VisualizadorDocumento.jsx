import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function VisualizadorDocumento({ isOpen, onClose, documento, casoId }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tempoVisualizacao, setTempoVisualizacao] = useState(0);
  const [visualizando, setVisualizando] = useState(false);
  const [mostrarConteudo, setMostrarConteudo] = useState(false);

  useEffect(() => {
    if (!documento || !isOpen) {
      setSignedUrl(null);
      setTempoVisualizacao(0);
      setVisualizando(false);
      return;
    }

    setVisualizando(true);
    const inicio = Date.now();

    return () => {
      const duracao = Math.floor((Date.now() - inicio) / 1000);
      setTempoVisualizacao(duracao);
      registrarAcessoMutation.mutate({
        documento_id: documento.id,
        tipo_acesso: 'visualizacao',
        tempo_visualizacao_segundos: duracao
      });
    };
  }, [isOpen, documento?.id]);

  const registrarAcessoMutation = useMutation({
    mutationFn: (dados) => base44.entities.AuditoriaDocumento.create(dados)
  });

  const carregarDocumento = async () => {
    // Verificar se há file_uri OU file_url
    const fileUri = documento?.file_uri;
    const fileUrl = documento?.file_url;

    if (!fileUri && !fileUrl) {
      alert('Caminho do arquivo não disponível. O documento precisa ser enviado primeiro.');
      return;
    }

    setLoading(true);
    try {
      // Se tiver file_uri (privado), gerar signed URL
      if (fileUri) {
        const resultado = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: fileUri,
          expires_in: 600 // 10 minutos
        });
        setSignedUrl(resultado.signed_url);
      } 
      // Se tiver apenas file_url (público), usar diretamente
      else if (fileUrl) {
        setSignedUrl(fileUrl);
      }
      
      setMostrarConteudo(true);
    } catch (error) {
      console.error('Erro ao carregar documento:', error);
      alert('Erro ao carregar documento: ' + (error.message || 'Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  if (!documento) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>{documento.nome_arquivo}</DialogTitle>
              <p className="text-sm text-slate-500 mt-1">Sigilo Fiscal - Acesso Controlado</p>
            </div>
            <Lock className="h-5 w-5 text-red-600 flex-shrink-0" />
          </div>
        </DialogHeader>

        {!mostrarConteudo ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-sm text-center mb-6">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">Documento com Sigilo Fiscal</h3>
              <p className="text-sm text-slate-700 mb-4">
                Este documento contém informações confidenciais protegidas por sigilo fiscal. Seu acesso será registrado em auditoria.
              </p>
              <div className="text-xs text-slate-600 space-y-1 mb-4">
                <p>✓ Acesso será registrado</p>
                <p>✓ Link expira em 10 minutos</p>
                <p>✓ Download não permitido</p>
              </div>
            </div>

            <Button 
              onClick={carregarDocumento}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar Documento
                </>
              )}
            </Button>
          </div>
        ) : signedUrl ? (
          <div className="space-y-4">
            <div className="w-full h-[600px] border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <iframe
                src={`${signedUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full"
                title={documento.nome_arquivo}
                allow="fullscreen"
              />
            </div>
            <div className="flex justify-center">
              <Button 
                variant="outline"
                onClick={() => window.open(signedUrl, '_blank')}
                className="text-sm"
              >
                Abrir em Nova Aba
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}