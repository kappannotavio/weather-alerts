/**
 * format.js
 * Formatação de valores para exibição em português do Brasil
 * (Intl API do navegador) e tradução dos códigos de tempo WMO
 * retornados pela API Open-Meteo.
 */

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Formata temperatura: 31.6 -> "32 °C". */
export function formatTemperature(value) {
  return typeof value === 'number' ? `${Math.round(value)} °C` : '—';
}

/** Formata umidade relativa: 18.2 -> "18%". */
export function formatHumidity(value) {
  return typeof value === 'number' ? `${Math.round(value)}%` : '—';
}

/** Formata data e hora: "04/11/2026 14:30". */
export function formatDateTime(isoString) {
  return isoString ? dateTimeFormatter.format(new Date(isoString)) : '—';
}

/** Formata apenas a hora: "14:30". */
export function formatTime(isoString) {
  return isoString ? timeFormatter.format(new Date(isoString)) : '—';
}

/** Converte ISO para o valor aceito por <input type="datetime-local">. */
export function toDateTimeLocalValue(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

// Códigos meteorológicos WMO (documentação Open-Meteo) agrupados em descrições curtas
const WEATHER_CODES = [
  [[0], 'Céu limpo'],
  [[1, 2], 'Parcialmente nublado'],
  [[3], 'Nublado'],
  [[45, 48], 'Nevoeiro'],
  [[51, 53, 55, 56, 57], 'Garoa'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'Chuva'],
  [[71, 73, 75, 77, 85, 86], 'Neve'],
  [[95, 96, 99], 'Trovoadas'],
];

/** Traduz o código WMO em descrição do tempo. */
export function describeWeatherCode(code) {
  const match = WEATHER_CODES.find(([codes]) => codes.includes(code));
  return match ? match[1] : 'Tempo indisponível';
}

/** Classifica o índice UV conforme a escala da OMS. */
export function describeUvIndex(value) {
  if (typeof value !== 'number') return '—';
  if (value < 3) return `${Math.round(value)} baixo`;
  if (value < 6) return `${Math.round(value)} moderado`;
  if (value < 8) return `${Math.round(value)} alto`;
  if (value < 11) return `${Math.round(value)} muito alto`;
  return `${Math.round(value)} extremo`;
}
