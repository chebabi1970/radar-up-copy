/**
 * Validação de CNPJ com dígitos verificadores (Mod-11)
 * Conforme regulamentação da Receita Federal do Brasil
 */

/**
 * Remove caracteres não numéricos do CNPJ
 */
export function limparCNPJ(cnpj) {
  return (cnpj || '').replace(/\D/g, '');
}

/**
 * Formata CNPJ para exibição: 00.000.000/0000-00
 */
export function formatarCNPJ(cnpj) {
  const limpo = limparCNPJ(cnpj);
  if (limpo.length !== 14) return cnpj || '';
  return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Valida CNPJ com algoritmo de dígitos verificadores (Mod-11)
 * Retorna { valido: boolean, erro?: string }
 */
export function validarCNPJ(cnpj) {
  const limpo = limparCNPJ(cnpj);

  if (!limpo) {
    return { valido: false, erro: 'CNPJ não informado' };
  }

  if (limpo.length !== 14) {
    return { valido: false, erro: 'CNPJ deve conter 14 dígitos' };
  }

  // Rejeitar CNPJs com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(limpo)) {
    return { valido: false, erro: 'CNPJ inválido (dígitos repetidos)' };
  }

  // Cálculo do primeiro dígito verificador
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(limpo[i]) * pesos1[i];
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;

  if (parseInt(limpo[12]) !== digito1) {
    return { valido: false, erro: 'CNPJ inválido (dígito verificador incorreto)' };
  }

  // Cálculo do segundo dígito verificador
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(limpo[i]) * pesos2[i];
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;

  if (parseInt(limpo[13]) !== digito2) {
    return { valido: false, erro: 'CNPJ inválido (dígito verificador incorreto)' };
  }

  return { valido: true };
}

/**
 * Máscara de input para CNPJ - formata enquanto digita
 */
export function mascararCNPJ(valor) {
  const limpo = limparCNPJ(valor).slice(0, 14);

  if (limpo.length <= 2) return limpo;
  if (limpo.length <= 5) return `${limpo.slice(0, 2)}.${limpo.slice(2)}`;
  if (limpo.length <= 8) return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5)}`;
  if (limpo.length <= 12) return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8)}`;
  return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12)}`;
}
