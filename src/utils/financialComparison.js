/**
 * Utilitários para comparação de valores financeiros
 * Implementa comparação percentual para evitar falsos positivos em valores grandes
 */

/**
 * Compara dois valores monetários com tolerância percentual
 * @param {number} valor1 - Primeiro valor a ser comparado
 * @param {number} valor2 - Segundo valor a ser comparado
 * @param {number} toleranciaPercentual - Tolerância em percentual (padrão: 0.1%)
 * @returns {object} Objeto com resultado da comparação
 */
export const compararValoresMonetarios = (valor1, valor2, toleranciaPercentual = 0.1) => {
  // Validação de entrada
  if (typeof valor1 !== 'number' || typeof valor2 !== 'number') {
    throw new Error('Os valores devem ser números');
  }

  if (isNaN(valor1) || isNaN(valor2)) {
    throw new Error('Os valores não podem ser NaN');
  }

  // Converte para valores absolutos para cálculo
  const v1 = Math.abs(valor1);
  const v2 = Math.abs(valor2);

  // Calcula a diferença absoluta
  const diferencaAbsoluta = Math.abs(v1 - v2);

  // Calcula o valor base (maior dos dois valores)
  const valorBase = Math.max(v1, v2);

  // Se o valor base for zero, compara diretamente
  if (valorBase === 0) {
    return {
      saoIguais: diferencaAbsoluta === 0,
      diferencaAbsoluta: diferencaAbsoluta,
      diferencaPercentual: 0,
      dentroTolerancia: diferencaAbsoluta === 0,
      mensagem: diferencaAbsoluta === 0 
        ? 'Valores idênticos (ambos zero)' 
        : 'Valores diferentes (um é zero)'
    };
  }

  // Calcula a diferença percentual em relação ao valor base
  const diferencaPercentual = (diferencaAbsoluta / valorBase) * 100;

  // Verifica se está dentro da tolerância
  const dentroTolerancia = diferencaPercentual <= toleranciaPercentual;

  return {
    saoIguais: diferencaAbsoluta === 0,
    diferencaAbsoluta: diferencaAbsoluta,
    diferencaPercentual: diferencaPercentual,
    dentroTolerancia: dentroTolerancia,
    mensagem: dentroTolerancia 
      ? `Valores compatíveis (diferença de ${diferencaPercentual.toFixed(4)}%)` 
      : `Valores incompatíveis (diferença de ${diferencaPercentual.toFixed(4)}%)`
  };
};

/**
 * Formata valor monetário para exibição
 * @param {number} valor - Valor a ser formatado
 * @param {string} moeda - Código da moeda (padrão: BRL)
 * @returns {string} Valor formatado
 */
export const formatarValorMonetario = (valor, moeda = 'BRL') => {
  if (typeof valor !== 'number' || isNaN(valor)) {
    return 'Valor inválido';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: moeda,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
};

/**
 * Extrai valor numérico de string monetária
 * @param {string} valorString - String contendo valor monetário
 * @returns {number|null} Valor numérico ou null se inválido
 */
export const extrairValorNumerico = (valorString) => {
  if (typeof valorString !== 'string') {
    return null;
  }

  // Remove símbolos de moeda, pontos de milhar e substitui vírgula por ponto
  const valorLimpo = valorString
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const valor = parseFloat(valorLimpo);
  
  return isNaN(valor) ? null : valor;
};

/**
 * Compara saldos bancários com tolerância para timing
 * @param {number} saldoContabil - Saldo registrado na contabilidade
 * @param {number} saldoBancario - Saldo nos extratos bancários
 * @returns {object} Resultado da comparação com nível de risco
 */
export const compararSaldosBancarios = (saldoContabil, saldoBancario) => {
  const resultado = compararValoresMonetarios(saldoContabil, saldoBancario, 0.1);
  
  return {
    ...resultado,
    nivelRisco: resultado.dentroTolerancia ? 'BAIXO' : 'CRITICO',
    requerAtencao: !resultado.dentroTolerancia,
    detalhes: {
      saldoContabil: formatarValorMonetario(saldoContabil),
      saldoBancario: formatarValorMonetario(saldoBancario),
      diferenca: formatarValorMonetario(resultado.diferencaAbsoluta)
    }
  };
};
