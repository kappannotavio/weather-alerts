/**
 * main.js
 * Ponto de entrada da página (index.html).
 * Cria o container de serviços, a view e o controlador.
 * Importa: createContainer, HomeView e HomeController.
 */
import { createContainer } from './config/container.js';
import { HomeView } from './views/HomeView.js';
import { HomeController } from './controllers/HomeController.js';

async function bootstrap() {
  const view = new HomeView();
  try {
    await new HomeController(createContainer(), view).init();
  } catch (error) {
    console.error(error);
    view.showStatus('Não foi possível iniciar o Alerta Saúde neste navegador.', true);
  }
}

bootstrap();
