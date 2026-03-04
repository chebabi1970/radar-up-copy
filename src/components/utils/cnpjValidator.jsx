/**
 * CNPJ validation utilities
 */

export function limparCNPJ(cnpj) {
  return (cnpj || '').replace(/\D/g, '');
}

export function mascararCNPJ(valor) {
  const limpo = limparCNPJ(valor).slice(0, 14);
  return limpo
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function validarCNPJ(cnpj) {
  const limpo = limparCNPJ(cnpj);

  if (limpo.length !== 14) {
    return { valido: false, erro: 'CNPJ deve ter 14 dígitos' };
  }

  if (/^(\d)\1+$/.test(limpo)) {
    return { valido: false, erro: 'CNPJ inválido' };
  }

  const calcDigit = (cnpjStr, length) => {
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += parseInt(cnpjStr.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result;
  };

  const digit1 = calcDigit(limpo, 12);
  if (digit1 !== parseInt(limpo.charAt(12))) {
    return { valido: false, erro: 'CNPJ inválido (dígito verificador incorreto)' };
  }

  const digit2 = calcDigit(limpo, 13);
  if (digit2 !== parseInt(limpo.charAt(13))) {
    return { valido: false, erro: 'CNPJ inválido (dígito verificador incorreto)' };
  }

  return { valido: true, erro: null };
}