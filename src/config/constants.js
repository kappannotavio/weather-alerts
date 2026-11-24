/**
 * constants.js
 * Configurações globais e enumerações do sistema Alerta Saúde.
 * Não contém segredos: os dados da estação vêm do espelho público do
 * WIS2 (OMM), que não exige chave de acesso.
 * Usado por: modelos, repositórios, serviços, controlador e view.
 */

// Estação monitorada: automática do INMET em Santiago/RS.
// O id WIGOS é o usado pelo INMET nos arquivos do WIS2 (campo CD_WSI do cadastro de estações).
export const STATION = Object.freeze({
  stationCode: 'A833',
  wigosId: '0-76-0-4317400000000441',
  name: 'Santiago, Rio Grande do Sul',
  latitude: -29.19167,
  longitude: -54.88556,
  utcOffsetHours: -3, // horário de Brasília, sem horário de verão
});

// Fuso usado para exibir datas e horas na interface (o mesmo da estação)
export const DISPLAY_TIME_ZONE = 'America/Sao_Paulo';

// Configuração geral da aplicação (congelada para evitar alteração em tempo de execução)
export const APP_CONFIG = Object.freeze({
  // Prefixo de todas as chaves gravadas no localStorage (versão do formato dos dados)
  STORAGE_NAMESPACE: 'alerta-saude:v1',

  // Espelho (global cache) do WIS2 mantido pelo Met Office no AWS. Guarda os
  // arquivos BUFR das últimas ~24 a 48 h e permite leitura direta pelo navegador.
  // (O servidor do próprio INMET, wis2bra.inmet.gov.br, tem CORS inválido.)
  WIS2_SYNOP_URL: 'https://wis2globalcache.s3.amazonaws.com/data/br-inmet/data/core/weather/surface-based-observations/synop',
  API_TIMEOUT_MS: 10000,

  // Horas para trás procuradas no espelho a cada atualização (só as que faltam no navegador)
  READINGS_LOOKBACK_HOURS: 36,

  // Medição mais antiga que isso gera um aviso de que a estação pode estar sem transmitir
  STALE_READING_MINUTES: 180,

  // Histórico diário: dias anteriores a hoje exibidos na tabela
  HISTORY_DAYS: 10,

  // Leituras horárias guardadas: hoje + os dias do histórico (24 por dia)
  MAX_CONDITIONS_PER_LOCATION: 24 * 11,
  MAX_ALERTS_PER_LOCATION: 30,

  // Intervalo de atualização automática da tela (a estação publica uma medição por hora)
  REFRESH_INTERVAL_MINUTES: 15,
});

// Chaves do localStorage (equivalentes às tabelas do Diagrama ER)
export const STORAGE_KEYS = Object.freeze({
  PREFERENCES: 'preferences',
  CONDITIONS_PREFIX: 'conditions:', // + id da localidade
  ALERTS_PREFIX: 'alerts:', // + id da localidade
});

// Temas visuais da página. Sem tema salvo (null), a página segue o tema do sistema.
export const THEMES = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
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
