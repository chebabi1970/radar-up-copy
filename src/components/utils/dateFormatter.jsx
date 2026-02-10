export const formatDateBrasilia = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
};

export const formatDateTimeBrasilia = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};