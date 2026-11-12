/**
 * recommendations.js
 * Catálogo das recomendações de saúde, definido no código.
 * Cada recomendação pertence a um nível de risco e a um público-alvo;
 * o sistema exibe as do nível calculado para o clima da localidade.
 * O último campo é a ilustração do cartão (assets/img/care/<nome>.svg).
 * Importa: Recommendation (modelo), RISK_LEVEL_IDS e TARGET_GROUPS.
 */
import { Recommendation } from '../models/Recommendation.js';
import { RISK_LEVEL_IDS } from './riskLevels.js';
import { TARGET_GROUPS } from '../config/constants.js';

const { NORMAL, ATTENTION, ALERT, EMERGENCY } = RISK_LEVEL_IDS;
const { GENERAL, CHILDREN, ELDERLY, OUTDOOR_WORKERS } = TARGET_GROUPS;

/** Monta a lista numerando o id dentro de cada nível (ex.: "alerta-03"). */
function build(items) {
  const counters = {};
  return items.map(([riskLevelId, targetGroup, title, description, illustration]) => {
    counters[riskLevelId] = (counters[riskLevelId] ?? 0) + 1;
    const id = `${riskLevelId}-${String(counters[riskLevelId]).padStart(2, '0')}`;
    return new Recommendation({ id, riskLevelId, targetGroup, title, description, illustration });
  });
}

export const RECOMMENDATIONS = Object.freeze(build([
  // Normal
  [NORMAL, GENERAL, 'Mantenha a hidratação', 'Beba água regularmente, mesmo sem sentir sede.', 'agua'],
  [NORMAL, GENERAL, 'Use protetor solar', 'Aplique protetor solar ao sair, principalmente entre 10h e 16h.', 'protetor'],
  [NORMAL, CHILDREN, 'Roupas leves para as crianças', 'Prefira roupas leves e chapéu nas brincadeiras ao ar livre.', 'roupa-leve'],

  // Atenção
  [ATTENTION, GENERAL, 'Beba água ao longo do dia', 'Leve uma garrafa de água e beba pequenos goles a cada hora.', 'garrafa'],
  [ATTENTION, GENERAL, 'Evite exercícios ao sol', 'Prefira praticar atividades físicas antes das 10h ou depois das 17h.', 'exercicio-horario'],
  [ATTENTION, CHILDREN, 'Ofereça água às crianças', 'Crianças nem sempre pedem água. Ofereça líquidos com frequência e vista-as com roupas leves.', 'copo-crianca'],
  [ATTENTION, ELDERLY, 'Acompanhe os idosos', 'Idosos sentem menos sede. Lembre-os de beber água e observe sinais de cansaço.', 'idosos'],
  [ATTENTION, OUTDOOR_WORKERS, 'Proteja-se no trabalho', 'Use chapéu de aba larga e roupas de manga longa e clara; reabasteça a garrafa de água no intervalo.', 'chapeu'],

  // Alerta
  [ALERT, GENERAL, 'Procure ambientes frescos', 'Fique em locais ventilados ou à sombra nas horas mais quentes do dia.', 'sombra'],
  [ALERT, GENERAL, 'Umidifique o ambiente', 'Com ar seco, use umidificador ou deixe uma toalha molhada ou bacia com água no quarto.', 'umidificador'],
  [ALERT, CHILDREN, 'Suspenda brincadeiras ao sol', 'Mantenha as crianças em locais sombreados entre 10h e 16h.', 'guarda-sol'],
  [ALERT, ELDERLY, 'Atenção a medicamentos', 'Quem usa diuréticos ou remédios para pressão deve conversar com a equipe de saúde sobre a hidratação.', 'remedios'],
  [ALERT, OUTDOOR_WORKERS, 'Faça pausas na sombra', 'Intercale o trabalho com pausas à sombra e beba água a cada 20 minutos.', 'pausa'],

  // Emergência
  [EMERGENCY, GENERAL, 'Fique em local fresco', 'Evite sair de casa nas horas mais quentes. Feche cortinas durante o dia.', 'casa-fresca'],
  [EMERGENCY, GENERAL, 'Reconheça a insolação', 'Tontura, pele quente e seca, confusão ou desmaio exigem atendimento. Ligue 192 (SAMU).', 'insolacao'],
  [EMERGENCY, CHILDREN, 'Nunca deixe crianças em carros', 'Um carro fechado aquece muito rápido. Nunca deixe crianças ou animais dentro do veículo.', 'carro'],
  [EMERGENCY, ELDERLY, 'Visite quem mora sozinho', 'Verifique ao menos duas vezes por dia como estão vizinhos e familiares idosos.', 'visita'],
  [EMERGENCY, OUTDOOR_WORKERS, 'Interrompa o trabalho ao sol', 'Suspenda atividades pesadas ao ar livre e procure abrigo com sombra e água.', 'parar-trabalho'],
]));
