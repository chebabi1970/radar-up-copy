import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import VisualizadorPDF from './VisualizadorPDF';

export default function VisualizadorDocumento({ isOpen, onClose, documento, casoId }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tempoVisualizacao, setTempoVisualizacao] = useState(0);
  const [visualizando, setVisualizando] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!documento || !isOpen || !user) {
      setSignedUrl(null);
      setTempoVisualizacao(0);
      setVisualizando(false);
      return;
    }

    setVisualizando(true);
    const inicio = Date.now();
    
    // Carregar documento automaticamente
    carregarDocumento();

    return () => {
      const duracao = Math.floor((Date.now() - inicio) / 1000);
      setTempoVisualizacao(duracao);
      registrarAcessoMutation.mutate({
        documento_id: documento.id,
        usuario_email: user.email,
        tipo_acesso: 'visualizacao',
        tempo_visualizacao_segundos: duracao
      });
    };
  }, [isOpen, documento?.id, user]);

  const registrarAcessoMutation = useMutation({
    mutationFn: (dados) => base44.entities.AuditoriaDocumento.create(dados)
  });

  const carregarDocumento = async () => {
    const fileUri = documento?.file_uri;
    const fileUrl = documento?.file_url;

    if (!fileUri && !fileUrl) {
      alert('Caminho do arquivo não disponível. O documento precisa ser enviado primeiro.');
      return;
    }

    setLoading(true);
    try {
      if (fileUri) {
        const resultado = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: fileUri,
          expires_in: 600
        });
        setSignedUrl(resultado.signed_url);
      } else if (fileUrl) {
        setSignedUrl(fileUrl);
      }
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
          <DialogTitle>{documento.nome_arquivo}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : signedUrl ? (
          <div className="space-y-4">
            <VisualizadorPDF url={signedUrl} nomeArquivo={documento?.nome_arquivo} />
            <div className="flex justify-center gap-2">
              <Button 
                variant="outline"
                onClick={() => window.open(signedUrl, '_blank')}
                size="sm"
              >
                Abrir em Nova Aba
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}