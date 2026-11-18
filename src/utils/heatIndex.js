/**
 * heatIndex.js
 * Sensação térmica pelo índice de calor (Heat Index) do serviço
 * meteorológico dos Estados Unidos (NOAA/NWS), a partir da temperatura
 * do ar e da umidade relativa medidas pela estação. Método: equação de
 * Steadman simplificada e, a partir de ~27 °C, regressão de Rothfusz com
 * os dois ajustes oficiais. A fórmula trabalha em °F; a função recebe e
 * devolve °C. Referência: https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
 * Função pura, sem dependências.
 */

const toFahrenheit = (celsius) => celsius * 9 / 5 + 32;
const toCelsius = (fahrenheit) => (fahrenheit - 32) * 5 / 9;

/**
 * Calcula a sensação térmica (°C, uma casa decimal).
 * @param {number} temperature - temperatura do ar (°C)
 * @param {number} humidity - umidade relativa (%)
 * @returns {number|null} null se faltar algum dos valores
 */
export function computeHeatIndex(temperature, humidity) {
  if (typeof temperature !== 'number' || typeof humidity !== 'number') return null;
  const t = toFahrenheit(temperature);
  const rh = humidity;

  // 1. Fórmula simples (Steadman); vale quando a média com a temperatura fica abaixo de 80 °F
  let index = 0.5 * (t + 61 + (t - 68) * 1.2 + rh * 0.094);

  if ((index + t) / 2 >= 80) {
    // 2. Regressão de Rothfusz
    index = -42.379 + 2.04901523 * t + 10.14333127 * rh
      - 0.22475541 * t * rh - 0.00683783 * t * t - 0.05481717 * rh * rh
      + 0.00122874 * t * t * rh + 0.00085282 * t * rh * rh - 0.00000199 * t * t * rh * rh;

    // Ajuste para ar muito seco (umidade < 13% entre 80 e 112 °F)
    if (rh < 13 && t >= 80 && t <= 112) {
      index -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
    }
    // Ajuste para ar muito úmido (umidade > 85% entre 80 e 87 °F)
    if (rh > 85 && t >= 80 && t <= 87) {
      index += ((rh - 85) / 10) * ((87 - t) / 5);
    }
  }
  return Number(toCelsius(index).toFixed(1));
}
