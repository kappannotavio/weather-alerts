/**
 * riskLevels.js
 * Catálogo dos níveis de risco, definido no código (sem cadastro).
 * Limites de umidade: escala usada pela Defesa Civil com base na OMS
 * (atenção < 30%, alerta < 20%, emergência < 12%).
 * Limites de temperatura: sensação térmica em faixas inspiradas no
 * Heat Index da NOAA.
 * Importa: RiskLevel (modelo).
 */
import { RiskLevel } from '../models/RiskLevel.js';

// Códigos fixos, usados como chave pelas recomendações, leituras e alertas
export const RISK_LEVEL_IDS = Object.freeze({
  NORMAL: 'normal',
  ATTENTION: 'atencao',
  ALERT: 'alerta',
  EMERGENCY: 'emergencia',
});

// Níveis do menos grave (severidade 0) para o mais grave (severidade 3)
export const RISK_LEVELS = Object.freeze([
  new RiskLevel({
    id: RISK_LEVEL_IDS.NORMAL,
    name: 'Normal',
    severity: 0,
    color: '#1E7A4C',
    description: 'Temperatura e umidade dentro de faixas seguras para a maioria das pessoas.',
  }),
  new RiskLevel({
    id: RISK_LEVEL_IDS.ATTENTION,
    name: 'Atenção',
    severity: 1,
    color: '#E3A800',
    description: 'Calor ou ar seco já pedem cuidado, principalmente para crianças e idosos.',
    minTemperature: 32,
    maxHumidity: 30,
    alertMessage: 'Atenção: calor ou ar seco hoje. Beba água ao longo do dia e evite esforço físico ao sol.',
  }),
  new RiskLevel({
    id: RISK_LEVEL_IDS.ALERT,
    name: 'Alerta',
    severity: 2,
    color: '#C55A11',
    description: 'Condições que aumentam o risco de desidratação, exaustão pelo calor e problemas respiratórios.',
    minTemperature: 37,
    maxHumidity: 20,
    alertMessage: 'Alerta de calor: temperatura elevada prevista para hoje. Mantenha-se hidratado, evite exposição prolongada ao sol e procure ambientes frescos.',
  }),
  new RiskLevel({
    id: RISK_LEVEL_IDS.EMERGENCY,
    name: 'Emergência',
    severity: 3,
    color: '#A82822',
    description: 'Risco alto para toda a população. Atividades ao ar livre devem ser suspensas.',
    minTemperature: 41,
    maxHumidity: 12,
    alertMessage: 'Emergência climática: calor extremo ou ar muito seco. Fique em local fresco, beba água com frequência e procure atendimento se sentir tontura, confusão ou falta de ar.',
  }),
]);

/** Busca um nível pelo código; retorna undefined se não existir. */
export function findRiskLevel(id) {
  return RISK_LEVELS.find((level) => level.id === id);
}
