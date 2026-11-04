/**
 * constants.js
 * Configurações globais e enumerações do sistema Alerta Saúde.
 * Não contém segredos: a API Open-Meteo é pública e não exige chave.
 * Usado por: modelos, repositórios, serviços e controlador.
 */

// Configuração geral da aplicação (congelada para evitar alteração em tempo de execução)
export const APP_CONFIG = Object.freeze({
  // Prefixo de todas as chaves gravadas no localStorage (versão do formato dos dados)
  STORAGE_NAMESPACE: 'alerta-saude:v1',

  // API de previsão do tempo e geocodificação (Open-Meteo, gratuita e sem chave)
  WEATHER_API_URL: 'https://api.open-meteo.com/v1/forecast',
  GEOCODING_API_URL: 'https://geocoding-api.open-meteo.com/v1/search',
  API_TIMEOUT_MS: 10000,

  // Tempo em que uma leitura climática salva é reaproveitada (cache)
  WEATHER_CACHE_MINUTES: 15,

  // Quantidade máxima de leituras e de alertas guardados por localidade
  MAX_CONDITIONS_PER_LOCATION: 24,
  MAX_ALERTS_PER_LOCATION: 30,

  // Intervalo de atualização automática da tela
  REFRESH_INTERVAL_MINUTES: 30,

  // Localização padrão: Santiago/RS (sede da URI Santiago)
  DEFAULT_LOCATION: Object.freeze({
    name: 'Santiago, Rio Grande do Sul',
    latitude: -29.1917,
    longitude: -54.8672,
  }),
});

// Chaves do localStorage (equivalentes às tabelas do Diagrama ER)
export const STORAGE_KEYS = Object.freeze({
  PREFERENCES: 'preferences',
  LOCATIONS: 'locations',
  CONDITIONS_PREFIX: 'conditions:', // + id da localidade
  ALERTS_PREFIX: 'alerts:', // + id da localidade
});

// Público-alvo das recomendações (grupos vulneráveis citados na proposta)
export const TARGET_GROUPS = Object.freeze({
  GENERAL: 'geral',
  CHILDREN: 'criancas',
  ELDERLY: 'idosos',
  OUTDOOR_WORKERS: 'trabalho_ao_ar_livre',
});

// Rótulos exibidos na interface para cada público-alvo
export const TARGET_GROUP_LABELS = Object.freeze({
  [TARGET_GROUPS.GENERAL]: 'Todos',
  [TARGET_GROUPS.CHILDREN]: 'Crianças',
  [TARGET_GROUPS.ELDERLY]: 'Idosos',
  [TARGET_GROUPS.OUTDOOR_WORKERS]: 'Trabalho ao ar livre',
});
