/**
 * http.js
 * Requisição HTTP GET com tempo limite (AbortController), usada pelos
 * serviços que consultam a API Open-Meteo. Converte falhas de rede e
 * respostas de erro em ExternalServiceError com mensagem para o usuário.
 * Importa: APP_CONFIG e ExternalServiceError.
 */
import { APP_CONFIG } from '../config/constants.js';
import { ExternalServiceError } from './errors.js';

/**
 * Busca e converte o JSON de uma URL.
 * @param {typeof fetch} httpClient - fetch (injetado para facilitar testes)
 * @param {string} url
 * @param {string} serviceName - nome do serviço usado nas mensagens, ex.: "clima"
 */
export async function fetchJson(httpClient, url, serviceName) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.API_TIMEOUT_MS);

  try {
    const response = await httpClient(url, { signal: controller.signal });
    if (!response.ok) {
      throw new ExternalServiceError(`O serviço de ${serviceName} respondeu com erro (${response.status}). Tente novamente em instantes.`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ExternalServiceError) throw error;
    throw new ExternalServiceError(`Não foi possível obter os dados do ${serviceName}. Verifique sua conexão com a internet.`);
  } finally {
    clearTimeout(timeoutId);
  }
}
