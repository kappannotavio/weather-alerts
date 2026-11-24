/**
 * format.js
 * Formatação de valores para exibição em português do Brasil
 * (Intl API do navegador). Datas e horas saem sempre no fuso da
 * estação (DISPLAY_TIME_ZONE), mesmo que o computador use outro fuso.
 * Importa: DISPLAY_TIME_ZONE (constants.js).
 */
import { DISPLAY_TIME_ZONE } from '../config/constants.js';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: DISPLAY_TIME_ZONE });
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: DISPLAY_TIME_ZONE });
// Dia "AAAA-MM-DD" já é local: formata em UTC para não deslocar a data
const dayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' });

/**
 * Formata temperatura: 31.6 -> "32 °C" ou, com decimals = 1, "31,6 °C"
 * (mesma precisão da tabela de dados do INMET).
 * @param {number|null} value
 * @param {number} decimals - casas decimais (padrão 0)
 */
export function formatTemperature(value, decimals = 0) {
  if (typeof value !== 'number') return '—';
  const text = value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${text} °C`;
}

/** Formata umidade relativa: 18.2 -> "18%". */
export function formatHumidity(value) {
  return typeof value === 'number' ? `${Math.round(value)}%` : '—';
}

/** Formata chuva acumulada: 2.2 -> "2,2 mm". */
export function formatPrecipitation(value) {
  return typeof value === 'number' ? `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mm` : '—';
}

/** Formata um dia "AAAA-MM-DD": "qua., 11/11". */
export function formatDay(dateString) {
  return dateString ? dayFormatter.format(new Date(`${dateString}T12:00:00Z`)) : '—';
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
