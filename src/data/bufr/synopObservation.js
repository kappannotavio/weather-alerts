/**
 * synopObservation.js
 * Extrai de uma mensagem SYNOP já decodificada (lista de descritores e
 * valores do BufrDecoder) os campos usados pelo Alerta Saúde e converte
 * as unidades da OMM para as usadas na interface:
 * Kelvin -> °C, Pascal -> hPa, kg/m² -> mm (são equivalentes).
 * Não acessa rede nem armazenamento.
 */

// Descritores BUFR (Tabela B da OMM) dos campos usados
const DESCRIPTORS = Object.freeze({
  WIGOS_SERIES: '001125',
  WIGOS_ISSUER: '001126',
  WIGOS_ISSUE: '001127',
  WIGOS_LOCAL: '001128',
  YEAR: '004001',
  MONTH: '004002',
  DAY: '004003',
  HOUR: '004004',
  MINUTE: '004005',
  PERIOD_HOURS: '004024',
  PERIOD_MINUTES: '004025',
  PRESSURE: '010004', // pressão na altura da estação (Pa)
  TEMPERATURE: '012101', // temperatura do ar (K)
  DEW_POINT: '012103', // ponto de orvalho (K)
  HUMIDITY: '013003', // umidade relativa (%)
  MAX_TEMPERATURE: '012111', // máxima no período indicado (K)
  MIN_TEMPERATURE: '012112', // mínima no período indicado (K)
  PRECIPITATION: '013011', // chuva acumulada no período indicado (kg/m² = mm)
});

const KELVIN_OFFSET = 273.15;

/** Primeiro valor não nulo do descritor, ou null. */
function firstValue(values, descriptor) {
  return values.find((item) => item.descriptor === descriptor && item.value !== null)?.value ?? null;
}

/**
 * Primeiro valor do descritor cujo período (último 004024/004025 lido
 * antes dele) dura "minutes" minutos. Ex.: chuva da última hora = 60.
 */
function valueForPeriod(values, descriptor, minutes) {
  let periodMinutes = null;
  for (const { descriptor: current, value } of values) {
    if (current === DESCRIPTORS.PERIOD_MINUTES && value !== null) periodMinutes = Math.abs(value);
    else if (current === DESCRIPTORS.PERIOD_HOURS && value !== null) periodMinutes = Math.abs(value) * 60;
    else if (current === descriptor && value !== null && periodMinutes === minutes) return value;
  }
  return null;
}

const kelvinToCelsius = (kelvin) => (kelvin === null ? null : Number((kelvin - KELVIN_OFFSET).toFixed(1)));

/**
 * Converte os valores de um subconjunto SYNOP em observação horária.
 * @param {Array<{descriptor: string, value: number|string|null}>} values
 * @returns {{ wigosId: string|null, observedAt: string, temperature: number|null, dewPoint: number|null,
 *   humidity: number|null, pressure: number|null, maxTemperature: number|null, minTemperature: number|null,
 *   precipitation: number|null }}
 */
export function extractSynopObservation(values) {
  const year = firstValue(values, DESCRIPTORS.YEAR);
  const month = firstValue(values, DESCRIPTORS.MONTH);
  const day = firstValue(values, DESCRIPTORS.DAY);
  const hour = firstValue(values, DESCRIPTORS.HOUR);
  if ([year, month, day, hour].some((part) => part === null)) {
    throw new Error('Mensagem SYNOP sem data e hora da observação.');
  }
  const minute = firstValue(values, DESCRIPTORS.MINUTE) ?? 0;

  // Identificador WIGOS no formato "série-emissor-número-local"
  const wigosParts = [DESCRIPTORS.WIGOS_SERIES, DESCRIPTORS.WIGOS_ISSUER, DESCRIPTORS.WIGOS_ISSUE, DESCRIPTORS.WIGOS_LOCAL]
    .map((descriptor) => firstValue(values, descriptor));
  const wigosId = wigosParts.every((part) => part !== null) ? wigosParts.join('-') : null;

  const pressure = firstValue(values, DESCRIPTORS.PRESSURE);
  return {
    wigosId,
    observedAt: new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString(),
    temperature: kelvinToCelsius(firstValue(values, DESCRIPTORS.TEMPERATURE)),
    dewPoint: kelvinToCelsius(firstValue(values, DESCRIPTORS.DEW_POINT)),
    humidity: firstValue(values, DESCRIPTORS.HUMIDITY),
    pressure: pressure === null ? null : Number((pressure / 100).toFixed(1)),
    maxTemperature: kelvinToCelsius(valueForPeriod(values, DESCRIPTORS.MAX_TEMPERATURE, 60)),
    minTemperature: kelvinToCelsius(valueForPeriod(values, DESCRIPTORS.MIN_TEMPERATURE, 60)),
    precipitation: valueForPeriod(values, DESCRIPTORS.PRECIPITATION, 60),
  };
}
