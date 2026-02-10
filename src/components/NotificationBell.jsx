import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeBrasilia } from '@/components/utils/dateFormatter';
import { toast } from 'sonner';

export default function NotificationBell() {
  const [user, setUser] = useState(null);
  const [unsubscribeRef, setUnsubscribeRef] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: notificacoes = [], refetch } = useQuery({
    queryKey: ['notificacoes', user?.email],
    queryFn: () => base44.entities.Notificacao.filter({ usuario_email: user?.email }, '-created_date', 100),
    enabled: !!user?.email,
    staleTime: 30000 // 30 segundos
  });

  useEffect(() => {
    if (!user?.email) return;
    
    // Cleanup anterior subscription se houver
    if (unsubscribeRef) {
      unsubscribeRef();
    }

    const unsubscribe = base44.entities.Notificacao.subscribe((event) => {
      if (event.data?.usuario_email === user.email) {
        refetch();
      }
    });
    
    setUnsubscribeRef(() => unsubscribe);
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.email, refetch]);

  const naoLidas = notificacoes.filter(n => !n.lida);

  const handleMarcarComoLida = async (id, lida) => {
    try {
      await base44.entities.Notificacao.update(id, {
        lida: !lida,
        data_leitura: !lida ? new Date().toISOString() : null
      });
      refetch();
    } catch (error) {
      console.error('Erro ao marcar notificação:', error);
      toast.error('Erro ao atualizar notificação');
    }
  };

  const handleLimparTodas = async () => {
    try {
      for (const notif of naoLidas) {
        await base44.entities.Notificacao.update(notif.id, {
          lida: true,
          data_leitura: new Date().toISOString()
        });
      }
      refetch();
      toast.success('Notificações marcadas como lidas');
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
      toast.error('Erro ao limpar notificações');
    }
  };

  const getTipoCor = (tipo) => {
    switch (tipo) {
      case 'sucesso': return 'bg-green-100 text-green-800 border-green-200';
      case 'alerta': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'erro': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative inline-flex p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          {naoLidas.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
              {naoLidas.length}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Notificações</h3>
            {naoLidas.length > 0 && (
              <button
                onClick={handleLimparTodas}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                Marcar como lida
              </button>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notificacoes.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {notificacoes.map(notif => (
                <div
                  key={notif.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    notif.lida ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 hover:bg-blue-50'
                  }`}
                  onClick={() => handleMarcarComoLida(notif.id, notif.lida)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${notif.lida ? 'bg-slate-300' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${notif.lida ? 'text-slate-600' : 'text-slate-900'}`}>
                          {notif.titulo}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getTipoCor(notif.tipo)}`}>
                          {notif.tipo}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{notif.mensagem}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {formatDateTimeBrasilia(notif.created_date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}