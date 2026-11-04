/**
 * errors.js
 * Hierarquia de erros da aplicação. Permite que o controlador trate
 * cada tipo de falha com uma mensagem adequada ao usuário.
 */

/** Erro base de todas as falhas previstas pela aplicação. */
export class AppError extends Error {
  constructor(message) {
    super(message);
    this.name = new.target.name;
  }
}

/** Falha em serviço externo (API de clima, geocodificação, geolocalização, rede). */
export class ExternalServiceError extends AppError {}

/** Falha ao gravar no armazenamento do navegador (bloqueado ou sem espaço). */
export class StorageError extends AppError {}
