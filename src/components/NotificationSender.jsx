import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

// ========== FUNÇÕES DE SEGURANÇA INLINE ==========
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '[EMAIL_INVÁLIDO]';
  const [name, domain] = email.split('@');
  if (!name || !domain) return '[EMAIL_INVÁLIDO]';
  return name.charAt(0) + '*'.repeat(Math.max(name.length - 2, 1)) + '@' + domain;
};

const validateInputSize = (input, maxLength = 5000) => {
  if (typeof input === 'string' && input.length > maxLength) {
    return { valid: false, error: `Entrada excede limite de ${maxLength} caracteres` };
  }
  return { valid: true };
};

const secureLog = (action, data, severity = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${severity.toUpperCase()}] ${action}`, data);
  }
};

const createRateLimiter = (maxAttempts = 5, windowMs = 60000) => {
  let attempts = [];
  return {
    allow: () => {
      const now = Date.now();
      attempts = attempts.filter(time => now - time < windowMs);
      if (attempts.length >= maxAttempts) return false;
      attempts.push(now);
      return true;
    },
    reset: () => { attempts = []; }
  };
};

export default function NotificationSender({ usuarios = [], open = false, onOpenChange }) {
  const [usuariosSelecionados, setUsuariosSelecionados] = useState(new Set());
  const [busca, setBusca] = useState('');
  const [notificationData, setNotificationData] = useState({ titulo: '', mensagem: '' });
  const [sending, setSending] = useState(false);
  
  // ========== SEGURANÇA: Rate Limiter ==========
  const notifRateLimiter = useRef(createRateLimiter(10, 60000)); // 10 notificações por minuto

  const handleSendNotifications = async () => {
    // ========== SEGURANÇA: Rate Limiting ==========
    if (!notifRateLimiter.current.allow()) {
      toast.error('Muitas notificações. Aguarde 1 minuto antes de tentar novamente');
      return;
    }

    // ========== SEGURANÇA: Validação de Entrada ==========
    const tituloSize = validateInputSize(notificationData.titulo, 100);
    const mensagemSize = validateInputSize(notificationData.mensagem, 5000);
    
    if (!tituloSize.valid) {
      toast.error('Título muito longo (máx 100 caracteres)');
      return;
    }
    if (!mensagemSize.valid) {
      toast.error('Mensagem muito longa (máx 5000 caracteres)');
      return;
    }

    if (!notificationData.titulo.trim() || !notificationData.mensagem.trim()) {
      toast.error('Preencha o título e a mensagem');
      return;
    }
    
    if (usuariosSelecionados.size === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }

    setSending(true);
    const usuariosParaNotificar = usuarios.filter(u => usuariosSelecionados.has(u.id));
    let enviadas = 0;
    const failedCount = usuariosParaNotificar.length;

    for (const u of usuariosParaNotificar) {
      try {
        await base44.entities.Notificacao.create({
          usuario_email: u.email,
          titulo: notificationData.titulo.substring(0, 100),
          mensagem: notificationData.mensagem.substring(0, 5000),
          tipo: 'info'
        });
        enviadas++;
      } catch (error) {
        // Log seguro: mascarar dados sensíveis
        secureLog('notification_error', {
          recipientMasked: maskEmail(u.email),
          error: error.message
        }, 'error');
      }
    }

    setSending(false);
    toast.success(`Notificações enviadas: ${enviadas}/${usuariosParaNotificar.length}`);
    
    // Log de auditoria
    secureLog('notifications_sent', {
      count: enviadas,
      totalAttempted: usuariosParaNotificar.length
    }, 'warning');
    
    onOpenChange(false);
    setNotificationData({ titulo: '', mensagem: '' });
    setUsuariosSelecionados(new Set());
    setBusca('');
  };

  const usuariosFiltrados = usuarios.filter(u =>
    u.email.toLowerCase().includes(busca.toLowerCase()) ||
    (u.full_name && u.full_name.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Notificações aos Usuários</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Seleção de Usuários */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-700">Selecionar Usuários</label>
              <button
                onClick={() => {
                  if (usuariosFiltrados.every(u => usuariosSelecionados.has(u.id))) {
                    const newSet = new Set(usuariosSelecionados);
                    usuariosFiltrados.forEach(u => newSet.delete(u.id));
                    setUsuariosSelecionados(newSet);
                  } else {
                    const newSet = new Set(usuariosSelecionados);
                    usuariosFiltrados.forEach(u => newSet.add(u.id));
                    setUsuariosSelecionados(newSet);
                  }
                }}
                className="text-xs text-green-600 hover:text-green-800 font-semibold"
              >
                {usuariosFiltrados.every(u => usuariosSelecionados.has(u.id)) ? 'Desselecionar filtrados' : 'Selecionar filtrados'}
              </button>
            </div>
            <Input
              placeholder="Buscar por email ou nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              disabled={sending}
              className="mb-3"
            />
            <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-slate-50">
              {usuariosFiltrados.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum usuário encontrado</p>
              ) : (
                usuariosFiltrados.map(u => (
                  <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usuariosSelecionados.has(u.id)}
                      onChange={(e) => {
                        const newSet = new Set(usuariosSelecionados);
                        if (e.target.checked) {
                          newSet.add(u.id);
                        } else {
                          newSet.delete(u.id);
                        }
                        setUsuariosSelecionados(newSet);
                      }}
                      disabled={sending}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">{u.full_name || u.email}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Título</label>
            <Input
              placeholder="Ex: Manutenção Programada"
              value={notificationData.titulo}
              onChange={(e) => setNotificationData({ ...notificationData, titulo: e.target.value })}
              disabled={sending}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Mensagem</label>
            <Textarea
              placeholder="Digite a mensagem da notificação..."
              value={notificationData.mensagem}
              onChange={(e) => setNotificationData({ ...notificationData, mensagem: e.target.value })}
              disabled={sending}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSendNotifications}
            disabled={sending || usuariosSelecionados.size === 0}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar para {usuariosSelecionados.size}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}