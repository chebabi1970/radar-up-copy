import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportErroButton({ currentPage }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media'
  });
  const queryClient = useQueryClient();

  const createReportMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.ReportErro.create({
        ...data,
        pagina_origem: currentPage || window.location.pathname,
        usuario_email: user.email
      });
    },
    onSuccess: () => {
      toast.success('Erro reportado com sucesso!');
      setOpen(false);
      setFormData({ titulo: '', descricao: '', prioridade: 'media' });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.descricao.trim()) {
      toast.error('Por favor, descreva o erro');
      return;
    }
    createReportMutation.mutate(formData);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <AlertCircle className="h-4 w-4" />
        Reportar Erro
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reportar Erro</DialogTitle>
            <DialogDescription>
              Descreva o problema encontrado. Sua mensagem será enviada para análise.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título (opcional)</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Erro ao salvar documento"
              />
            </div>

            <div>
              <Label htmlFor="descricao">Descrição do Erro *</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o que aconteceu, o que você estava fazendo, etc."
                className="h-32"
                required
              />
            </div>

            <div>
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select
                value={formData.prioridade}
                onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createReportMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {createReportMutation.isPending ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}