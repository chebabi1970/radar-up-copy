import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useTrial } from './useTrial';
import { AlertTriangle, Clock, CreditCard } from 'lucide-react';

export default function TrialBanner() {
  const { loading, trialExpired, daysRemaining } = useTrial();

  if (loading) return null;

  if (trialExpired) {
    return (
      <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Seu período de teste expirou. Algumas funcionalidades estão bloqueadas.</span>
        </div>
        <Link
          to={createPageUrl('Assinatura')}
          className="flex-shrink-0 bg-white text-red-600 font-semibold px-3 py-1 rounded-full text-xs hover:bg-red-50 transition-colors"
        >
          Assinar agora
        </Link>
      </div>
    );
  }

  if (daysRemaining <= 7) {
    return (
      <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>
            {daysRemaining === 0
              ? 'Último dia do seu período gratuito!'
              : `Restam ${daysRemaining} dia${daysRemaining > 1 ? 's' : ''} no seu período gratuito.`}
          </span>
        </div>
        <Link
          to={createPageUrl('Assinatura')}
          className="flex-shrink-0 bg-white text-amber-600 font-semibold px-3 py-1 rounded-full text-xs hover:bg-amber-50 transition-colors"
        >
          <CreditCard className="h-3 w-3 inline mr-1" />
          Assinar
        </Link>
      </div>
    );
  }

  // More than 7 days remaining - subtle info in sidebar
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
      <span>Teste gratuito: <strong>{daysRemaining} dias</strong> restantes</span>
    </div>
  );
}