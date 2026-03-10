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

  // More than 7 days remaining - full-width info banner
  return (
    <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span>Você está no período de teste gratuito. Restam <strong>{daysRemaining} dias</strong>.</span>
      </div>
      <Link
        to={createPageUrl('Assinatura')}
        className="flex-shrink-0 bg-white text-blue-600 font-semibold px-3 py-1 rounded-full text-xs hover:bg-blue-50 transition-colors"
      >
        <CreditCard className="h-3 w-3 inline mr-1" />
        Assinar
      </Link>
    </div>
  );
}