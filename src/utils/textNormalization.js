/**
 * Utilitários avançados para normalização de texto
 * Melhora a comparação de nomes, endereços e outros campos textuais
 */

// Mapeamento de abreviações comuns
const ABREVIACOES = {
  // Logradouros
  'r.': 'rua',
  'r ': 'rua ',
  'av.': 'avenida',
  'av ': 'avenida ',
  'trav.': 'travessa',
  'pç.': 'praça',
  'pc.': 'praça',
  'pca.': 'praça',
  'al.': 'alameda',
  'rod.': 'rodovia',
  'estr.': 'estrada',
  'vl.': 'vila',
  'jd.': 'jardim',
  'cj.': 'conjunto',
  'qd.': 'quadra',
  'lt.': 'lote',
  'bl.': 'bloco',
  'ap.': 'apartamento',
  'apt.': 'apartamento',
  'sl.': 'sala',
  'andar': 'andar',
  'and.': 'andar',
  
  // Títulos e tratamentos
  'sr.': 'senhor',
  'sra.': 'senhora',
  'dr.': 'doutor',
  'dra.': 'doutora',
  'eng.': 'engenheiro',
  'enga.': 'engenheira',
  'prof.': 'professor',
  'profa.': 'professora',
  
  // Empresas
  'ltda.': 'limitada',
  'ltda': 'limitada',
  's.a.': 'sociedade anonima',
  's/a': 'sociedade anonima',
  'sa': 'sociedade anonima',
  'cia.': 'companhia',
  'cia': 'companhia',
  'me': 'microempresa',
  'epp': 'empresa de pequeno porte',
  'eireli': 'empresa individual de responsabilidade limitada'
};

// Palavras a serem removidas (stopwords)
const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os',
  'em', 'no', 'na', 'nos', 'nas', 'com', 'sem', 'para', 'por'
]);

/**
 * Remove acentos de uma string
 * @param {string} texto - Texto a ser normalizado
 * @returns {string} Texto sem acentos
 */
export const removerAcentos = (texto) => {
  if (typeof texto !== 'string') return '';
  
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Expande abreviações comuns
 * @param {string} texto - Texto contendo abreviações
 * @returns {string} Texto com abreviações expandidas
 */
export const expandirAbreviacoes = (texto) => {
  if (typeof texto !== 'string') return '';
  
  let textoExpandido = texto.toLowerCase();
  
  // Ordena as abreviações por tamanho (maiores primeiro) para evitar substituições parciais
  const abreviacoesOrdenadas = Object.keys(ABREVIACOES).sort((a, b) => b.length - a.length);
  
  for (const abrev of abreviacoesOrdenadas) {
    const regex = new RegExp(`\\b${abrev.replace('.', '\\.')}`, 'gi');
    textoExpandido = textoExpandido.replace(regex, ABREVIACOES[abrev]);
  }
  
  return textoExpandido;
};

/**
 * Remove stopwords de um texto
 * @param {string} texto - Texto a ser processado
 * @returns {string} Texto sem stopwords
 */
export const removerStopwords = (texto) => {
  if (typeof texto !== 'string') return '';
  
  return texto
    .split(/\s+/)
    .filter(palavra => !STOPWORDS.has(palavra.toLowerCase()))
    .join(' ');
};

/**
 * Normaliza texto básico (lowercase, trim, remove caracteres especiais)
 * @param {string} texto - Texto a ser normalizado
 * @returns {string} Texto normalizado
 */
export const normalizarTextoBasico = (texto) => {
  if (typeof texto !== 'string') return '';
  
  return texto
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Normalização avançada de texto com todas as transformações
 * @param {string} texto - Texto a ser normalizado
 * @param {object} opcoes - Opções de normalização
 * @returns {string} Texto normalizado
 */
export const normalizarTextoAvancado = (texto, opcoes = {}) => {
  const {
    expandirAbreviacoes: expandir = true,
    removerStopwords: removerStop = false,
    removerAcentos: removerAcent = true,
    removerNumeros = false
  } = opcoes;
  
  if (typeof texto !== 'string') return '';
  
  let textoNormalizado = texto;
  
  // 1. Expande abreviações
  if (expandir) {
    textoNormalizado = expandirAbreviacoes(textoNormalizado);
  }
  
  // 2. Remove acentos
  if (removerAcent) {
    textoNormalizado = removerAcentos(textoNormalizado);
  }
  
  // 3. Normalização básica
  textoNormalizado = normalizarTextoBasico(textoNormalizado);
  
  // 4. Remove números se solicitado
  if (removerNumeros) {
    textoNormalizado = textoNormalizado.replace(/\d+/g, '');
  }
  
  // 5. Remove stopwords
  if (removerStop) {
    textoNormalizado = removerStopwords(textoNormalizado);
  }
  
  return textoNormalizado.trim();
};

/**
 * Compara dois textos com normalização avançada
 * @param {string} texto1 - Primeiro texto
 * @param {string} texto2 - Segundo texto
 * @param {object} opcoes - Opções de normalização
 * @returns {object} Resultado da comparação
 */
export const compararTextos = (texto1, texto2, opcoes = {}) => {
  const t1Normalizado = normalizarTextoAvancado(texto1, opcoes);
  const t2Normalizado = normalizarTextoAvancado(texto2, opcoes);
  
  const saoIguais = t1Normalizado === t2Normalizado;
  
  // Calcula similaridade usando Levenshtein simplificado
  const similaridade = calcularSimilaridade(t1Normalizado, t2Normalizado);
  
  return {
    saoIguais,
    similaridade,
    texto1Original: texto1,
    texto2Original: texto2,
    texto1Normalizado: t1Normalizado,
    texto2Normalizado: t2Normalizado,
    altaSimilaridade: similaridade >= 0.9
  };
};

/**
 * Calcula similaridade entre dois textos (0 a 1)
 * @param {string} s1 - Primeira string
 * @param {string} s2 - Segunda string
 * @returns {number} Índice de similaridade (0 a 1)
 */
const calcularSimilaridade = (s1, s2) => {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  
  const distancia = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  
  return 1 - (distancia / maxLen);
};

/**
 * Calcula distância de Levenshtein entre duas strings
 * @param {string} s1 - Primeira string
 * @param {string} s2 - Segunda string
 * @returns {number} Distância de Levenshtein
 */
const levenshteinDistance = (s1, s2) => {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
};

/**
 * Normaliza especificamente para nomes de pessoas
 * @param {string} nome - Nome a ser normalizado
 * @returns {string} Nome normalizado
 */
export const normalizarNome = (nome) => {
  return normalizarTextoAvancado(nome, {
    expandirAbreviacoes: true,
    removerStopwords: false,
    removerAcentos: true,
    removerNumeros: false
  });
};

/**
 * Normaliza especificamente para endereços
 * @param {string} endereco - Endereço a ser normalizado
 * @returns {string} Endereço normalizado
 */
export const normalizarEndereco = (endereco) => {
  return normalizarTextoAvancado(endereco, {
    expandirAbreviacoes: true,
    removerStopwords: false,
    removerAcentos: true,
    removerNumeros: false
  });
};

/**
 * Normaliza especificamente para razão social
 * @param {string} razaoSocial - Razão social a ser normalizada
 * @returns {string} Razão social normalizada
 */
export const normalizarRazaoSocial = (razaoSocial) => {
  return normalizarTextoAvancado(razaoSocial, {
    expandirAbreviacoes: true,
    removerStopwords: false,
    removerAcentos: true,
    removerNumeros: false
  });
};
