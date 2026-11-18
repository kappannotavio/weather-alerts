/**
 * http.js
 * Download de arquivos binários com tempo limite (AbortController),
 * usado pelo StationService para baixar as mensagens BUFR do WIS2.
 * Arquivo inexistente (4xx) devolve null: no WIS2 isso só significa
 * que aquela hora não foi publicada. Falhas de rede e erros do servidor
 * (5xx) viram ExternalServiceError com mensagem para o usuário.
 * Importa: APP_CONFIG e ExternalServiceError.
 */
import { APP_CONFIG } from '../config/constants.js';
import { ExternalServiceError } from './errors.js';

/**
 * Baixa o conteúdo de uma URL como bytes.
 * @param {typeof fetch} httpClient - fetch (injetado para facilitar testes)
 * @param {string} url
 * @param {string} serviceName - nome do serviço usado nas mensagens, ex.: "estação meteorológica"
 * @returns {Promise<Uint8Array|null>} null quando o arquivo não existe
 */
export async function fetchBytes(httpClient, url, serviceName) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.API_TIMEOUT_MS);

  try {
    const response = await httpClient(url, { signal: controller.signal });
    if (response.status >= 400 && response.status < 500) return null;
    if (!response.ok) {
      throw new ExternalServiceError(`O serviço de ${serviceName} respondeu com erro (${response.status}). Tente novamente em instantes.`);
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof ExternalServiceError) throw error;
    throw new ExternalServiceError(`Não foi possível obter os dados da ${serviceName}. Verifique sua conexão com a internet.`);
  } finally {
    clearTimeout(timeoutId);
  }
}
