import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const TRIAL_DAYS = 30;

export function useTrial() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || !user) {
    return { loading: true, trialExpired: false, daysRemaining: TRIAL_DAYS, trialActive: true };
  }

  const createdDate = new Date(user.created_date);
  const now = new Date();
  const daysUsed = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, TRIAL_DAYS - daysUsed);
  const trialExpired = daysUsed >= TRIAL_DAYS;

  return { loading: false, trialExpired, daysRemaining, trialActive: !trialExpired };
}