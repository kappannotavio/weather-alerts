# Alerta Saúde

Aplicação web que informa à população o risco à saúde causado pelo calor e pela baixa umidade do ar, com recomendações de cuidado e alertas. Projeto ligado ao PET-Saúde Clima.

- **Linguagem:** JavaScript (ES2022, classes e módulos ES), HTML5 e CSS3, sem framework e sem bibliotecas externas.
- **Dados climáticos:** [Open-Meteo](https://open-meteo.com/), API gratuita e sem chave de acesso.
- **Níveis de risco e recomendações:** definidos no próprio código (`src/catalog`).
- **Armazenamento:** `localStorage` do navegador, separado por localidade. Não há servidor nem cadastro.

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

Executa os testes unitários (`node:test`) das regras de classificação de risco, do catálogo, das entidades e da persistência (com `localStorage` simulado).

## Estrutura

```
index.html                 Página da aplicação
assets/                    CSS e ícone
src/
  config/                  Constantes e container de dependências
  catalog/                 Níveis de risco e recomendações (dados no código)
  models/                  Entity, Location, Preferences, ClimateCondition, Alert, RiskLevel, Recommendation
  data/                    BrowserStorage (localStorage) e repositórios
  services/                Clima, localidades, preferências, classificação, recomendações, alertas, notificações
  controllers/             HomeController
  views/                   HomeView
  utils/                   Erros, DOM e formatação
tests/                     Testes unitários
```

A documentação do trabalho (DOCX/PDF e diagramas UML) é entregue à parte e não fica no repositório.

## Dados salvos no navegador

| Chave | Conteúdo |
|---|---|
| `alerta-saude:v1:preferences` | Localidade atual, notificações e tema (claro/escuro) |
| `alerta-saude:v1:locations` | Localidades consultadas |
| `alerta-saude:v1:conditions:<id>` | Últimas 24 leituras da localidade |
| `alerta-saude:v1:alerts:<id>` | Últimos 30 alertas da localidade |

O `<id>` da localidade é formado pelas coordenadas com duas casas decimais (ex.: `-29.19_-54.87`).

## Limitações

Os dados ficam no navegador de cada dispositivo, e as notificações só são verificadas enquanto a página está aberta. Níveis de risco e recomendações mudam por meio de uma nova versão do código.
