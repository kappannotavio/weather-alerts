# Alerta Saúde

Aplicação web que informa à população de Santiago (RS) o risco à saúde causado pelo calor e pela baixa umidade do ar, com recomendações de cuidado e alertas. Projeto ligado ao PET-Saúde Clima.

- **Linguagem:** JavaScript (ES2022, classes e módulos ES), HTML5 e CSS3, sem framework e sem bibliotecas externas.
- **Dados climáticos:** medições de hora em hora da estação automática do INMET em Santiago (**A833**), obtidas pelo [WIS2](https://community.wmo.int/en/activity-areas/wis), o sistema de troca de dados da Organização Meteorológica Mundial. Sem chave de acesso.
- **Sensação térmica:** calculada pelo índice de calor da NOAA (temperatura + umidade), pois a estação não a mede.
- **Níveis de risco e recomendações:** definidos no próprio código (`src/catalog`).
- **Armazenamento:** `localStorage` do navegador. Não há servidor nem cadastro.

## Como executar

Os módulos ES precisam de um servidor HTTP (abrir o `index.html` direto pelo explorador de arquivos não funciona).

```bash
npm start
```

Acesse `http://localhost:5500`. Sem Node.js: `python -m http.server 5500`.

## Testes

```bash
npm test
```

Executa os testes unitários (`node:test`) do decodificador BUFR (com uma mensagem real da A833 em `tests/fixtures`), do serviço da estação, do histórico diário, da classificação de risco, do catálogo, das entidades e da persistência (com `fetch` e `localStorage` simulados).

## Estrutura

```
index.html                 Página da aplicação
assets/                    CSS, ícone e ilustrações das recomendações
src/
  config/                  Constantes (estação, WIS2) e container de dependências
  catalog/                 Níveis de risco e recomendações (dados no código)
  models/                  Entity, Location, Preferences, ClimateCondition, DailyClimate, Alert, RiskLevel, Recommendation
  data/                    BrowserStorage (localStorage) e repositórios
  data/bufr/               Decodificador BUFR, tabelas da OMM e leitura da mensagem SYNOP
  services/                Estação (WIS2), histórico, preferências, classificação, recomendações, alertas, notificações
  controllers/             HomeController
  views/                   HomeView
  utils/                   Erros, DOM, formatação, download e índice de calor
tests/                     Testes unitários e mensagem BUFR de exemplo
```

A documentação do trabalho (DOCX/PDF e diagramas UML) é entregue à parte e não fica no repositório.

## Como os dados da estação chegam ao app

1. O INMET publica cada hora medida pela A833 no WIS2, num arquivo no formato **BUFR** (binário, padrão da OMM).
2. O app baixa esses arquivos do espelho público do WIS2 mantido pelo Met Office no AWS (`wis2globalcache.s3.amazonaws.com`). O servidor do próprio INMET (`wis2bra.inmet.gov.br`) tem o mesmo conteúdo, mas envia o cabeçalho CORS duplicado e o navegador bloqueia a leitura.
3. Cada arquivo tem o nome `WIGOS_0-76-0-4317400000000441_AAAAMMDDTHH0000.bufr4` (código WIGOS da A833 + hora em UTC). A cada atualização, o app procura só as horas das últimas 36 h que ainda não estão salvas.
4. `src/data/bufr/BufrDecoder.js` decodifica o arquivo, e `synopObservation.js` extrai temperatura, umidade, ponto de orvalho, pressão e chuva da última hora, convertendo as unidades (K → °C, Pa → hPa).

O espelho guarda cerca de 24 a 48 horas. Por isso, o **histórico dos últimos 10 dias** é calculado com as medições já salvas no navegador e se completa conforme o app é usado. A coluna "Horas medidas" mostra quantas horas de cada dia estão salvas.

### Comparando com o site do INMET

As tabelas e grades do INMET (`tempo.inmet.gov.br/TabelaEstacoes/A833` e `mapas.inmet.gov.br`) mostram as horas em **UTC**, enquanto o app mostra o **horário de Brasília** (UTC−3), que é o horário local de Santiago. Por isso a mesma medição aparece com 3 horas de diferença:

| App (Brasília) | INMET (UTC) |
|---|---|
| 09:00 | 12h |
| 10:00 | 13h |
| 21:00 | 00h do dia seguinte |

O mesmo vale para o "dia": o resumo de um dia no app vai de 0h a 23h de Brasília (03h UTC até 02h UTC do dia seguinte).

Na tabela "Últimas medições" a temperatura aparece com uma casa decimal, como no INMET. Nos cartões principais, ela é arredondada para o inteiro mais próximo (23,4 °C → 23 °C).

## Dados salvos no navegador

| Chave | Conteúdo |
|---|---|
| `alerta-saude:v1:preferences` | Notificações e tema (claro/escuro) |
| `alerta-saude:v1:conditions:<id>` | Medições horárias da estação (até 11 dias: hoje + 10) |
| `alerta-saude:v1:alerts:<id>` | Últimos 30 alertas |

O `<id>` é formado pelas coordenadas da estação com duas casas decimais (`-29.19_-54.89`).

Ao abrir, o app apaga os dados deixados por versões anteriores (que usavam o Open-Meteo e várias cidades): cidades consultadas, cache do histórico, leituras e alertas de outras localidades e a localidade salva nas preferências (`src/data/LegacyDataCleaner.js`).

## Limitações

- Só a estação A833 (Santiago/RS) é monitorada.
- Quando a estação fica sem transmitir, a página mostra a última medição disponível e avisa a hora dela.
- Os dados ficam no navegador de cada dispositivo, e as notificações só são verificadas enquanto a página está aberta.
- Níveis de risco e recomendações mudam por meio de uma nova versão do código.
