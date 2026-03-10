import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Shield, Zap, Star } from 'lucide-react';

const PRICE_ID = 'price_1T9YliPCLkkSSsicPzvtVOHI';

export default function Assinatura() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    // Block if running inside an iframe
    if (window.self !== window.top) {
      alert('O checkout só funciona a partir do app publicado. Por favor, acesse o app publicado para assinar.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await base44.functions.invoke('stripeCheckout', {
        price_id: PRICE_ID,
        success_url: window.location.origin + '/?subscribed=true',
        cancel_url: window.location.href,
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        setError('Não foi possível iniciar o checkout. Tente novamente.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao iniciar o checkout. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Gestão completa de casos e clientes',
    'Análise de documentos com IA',
    'Verificação de conformidade automática',
    'Relatórios e exportação em PDF',
    'Dashboard analítico completo',
    'Suporte via WhatsApp',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200 mb-4">
            <Star className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">RADAR UP</h1>
          <p className="text-slate-500">Plataforma de Habilitação para Exportação</p>
        </div>

        {/* Plan Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden">
          {/* Plan Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-sm font-medium mb-3">
              <Zap className="w-4 h-4" />
              Plano Único
            </div>
            <div className="flex items-end justify-center gap-1">
              <span className="text-xl font-medium opacity-80">R$</span>
              <span className="text-5xl font-bold">89</span>
              <span className="text-2xl font-bold">,90</span>
              <span className="text-lg opacity-80 mb-1">/mês</span>
            </div>
            <p className="text-white/70 text-sm mt-2">Acesso completo a todos os recursos</p>
          </div>

          {/* Features */}
          <div className="p-6">
            <ul className="space-y-3 mb-6">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-200 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Redirecionando...
                </>
              ) : (
                'Assinar Agora'
              )}
            </Button>

            {/* Security badge */}
            <div className="flex items-center justify-center gap-2 mt-4 text-slate-400 text-xs">
              <Shield className="w-4 h-4" />
              <span>Pagamento seguro via Stripe. Cancele quando quiser.</span>
            </div>
          </div>
        </div>

        {/* Test mode notice */}
        <div className="mt-4 text-center text-xs text-slate-400">
          Modo de teste ativo. Use o cartão <strong>4242 4242 4242 4242</strong> para testar.
        </div>
      </div>
    </div>
  );
}