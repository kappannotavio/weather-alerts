/**
 * LocationService.js
 * Busca de localidades:
 * - cidades pelo nome, na API de geocodificação Open-Meteo;
 * - posição atual pelo GPS/rede, via Geolocation API do navegador.
 * Devolve objetos Location (ainda não gravados).
 * Importa: APP_CONFIG, Location e ExternalServiceError.
 */
import { APP_CONFIG } from '../config/constants.js';
import { Location } from '../models/Location.js';
import { ExternalServiceError } from '../utils/errors.js';

export class LocationService {
  /** @param {typeof fetch} httpClient */
  constructor(httpClient = globalThis.fetch?.bind(globalThis)) {
    this.httpClient = httpClient;
  }

  /**
   * Busca cidades brasileiras pelo nome.
   * @param {string} query - texto digitado pelo usuário
   * @returns {Promise<Location[]>}
   */
  async searchCities(query) {
    const term = query.trim();
    if (term.length < 2) return [];

    const params = new URLSearchParams({ name: term, count: '6', language: 'pt', countryCode: 'BR', format: 'json' });
    let response;
    try {
      response = await this.httpClient(`${APP_CONFIG.GEOCODING_API_URL}?${params}`);
    } catch {
      throw new ExternalServiceError('Não foi possível buscar cidades. Verifique sua conexão.');
    }
    if (!response.ok) {
      throw new ExternalServiceError('O serviço de busca de cidades está indisponível.');
    }
    const json = await response.json();
    // Converte o formato da API para Location ("Cidade, Estado")
    return (json.results ?? []).map((place) => new Location({
      name: place.admin1 ? `${place.name}, ${place.admin1}` : place.name,
      latitude: place.latitude,
      longitude: place.longitude,
    }));
  }

  /**
   * Obtém a posição atual do dispositivo (pede permissão ao usuário).
   * @returns {Promise<Location>}
   */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new ExternalServiceError('Seu navegador não permite obter a localização.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(new Location({
          name: 'Minha localização',
          // Arredonda para 2 casas (~1 km): suficiente para o clima e preserva a privacidade
          latitude: Number(position.coords.latitude.toFixed(2)),
          longitude: Number(position.coords.longitude.toFixed(2)),
        })),
        () => reject(new ExternalServiceError('Não foi possível obter sua localização. Busque a cidade pelo nome.')),
        { timeout: 10000, maximumAge: 10 * 60 * 1000 },
      );
    });
  }
}
