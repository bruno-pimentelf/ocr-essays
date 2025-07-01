# 📝 API Demo - Correção de Redações com OCR

Esta documentação descreve as rotas de demonstração para correção de redações que incluem processamento de OCR e correção por IA.

## 🎯 Visão Geral

O sistema possui *duas rotas separadas* que trabalham em conjunto:

1.⁠ ⁠*Processamento OCR*: Corrige erros de OCR e infere o tema da redação
2.⁠ ⁠*Correção da Redação*: Aplica correção pedagógica completa usando IA

	⁠*⚠️ Importante: Estas rotas são apenas para demonstração e **não salvam dados no banco*.

---

## 🔍 Rota 1: Processamento OCR

### Resumo
Recebe um texto bruto (com possíveis erros de OCR) e retorna o texto corrigido junto com o tema inferido pela IA.

### Endpoint

POST /essays/demo/process-ocr


### Headers
⁠ json
{
  "Content-Type": "application/json"
}
 ⁠

### Request Payload
⁠ json
{
  "content": "string - Texto bruto da redação (com possíveis erros de OCR)"
}
 ⁠

### Response
⁠ json
{
  "correctedText": "string - Texto corrigido pela IA",
  "inferredTheme": "string - Tema inferido pela IA"
}
 ⁠

### Exemplo Completo

*Request:*
⁠ bash
curl -X POST http://localhost:80/essays/demo/process-ocr \
  -H "Content-Type: application/json" \
  -d '{
    "content": "A clarice lispactor uma autora brasileira muito renomada, conhecida por demonstrar de forma explicita sua opiniac em crónicas e poemas, utilica dos seus livras. abordar varios pilares sociais, um de seus misse quentes e sobre a vibricação da mulher e como isso ageta a vida da mesma."
  }'
 ⁠

*Response:*
⁠ json
{
  "correctedText": "A Clarice Lispector uma autora brasileira muito renomada, conhecida por demonstrar de forma explícita sua opinião em crônicas e poemas, utiliza dos seus livros para abordar vários pilares sociais, um de seus temas mais quentes é sobre a participação da mulher e como isso afeta a vida da mesma.",
  "inferredTheme": "A participação da mulher na sociedade brasileira"
}
 ⁠

---

## ✏️ Rota 2: Correção da Redação

### Resumo
Recebe um texto já corrigido e seu tema, e retorna a correção pedagógica completa (notas, competências, feedback) igual ao sistema real.

### Endpoint

POST /essays/demo/correct


### Headers
⁠ json
{
  "Content-Type": "application/json"
}
 ⁠

### Request Payload
⁠ json
{
  "content": "string - Texto da redação já corrigido",
  "theme": "string - Tema da redação"
}
 ⁠

### Response
⁠ json
{
  "nota_total": "string - Nota final (0-1000)",
  "competencia_1": {
    "nota": "string - Nota da competência (0-200)",
    "titulo": "string - Nome da competência",
    "feedback": "string - Feedback detalhado",
    "aspectos_positivos": ["array de strings"],
    "aspectos_melhorar": ["array de strings"]
  },
  "competencia_2": { /* ... mesmo formato ... */ },
  "competencia_3": { /* ... mesmo formato ... */ },
  "competencia_4": { /* ... mesmo formato ... */ },
  "competencia_5": { /* ... mesmo formato ... */ },
  "feedback_geral": "string - Feedback geral da redação",
  "pontos_fortes": ["array de strings"],
  "pontos_melhorar": ["array de strings"]
}
 ⁠

### Exemplo Completo

*Request:*
⁠ bash
curl -X POST http://localhost:80/essays/demo/correct \
  -H "Content-Type: application/json" \
  -d '{
    "content": "A Clarice Lispector uma autora brasileira muito renomada, conhecida por demonstrar de forma explícita sua opinião em crônicas e poemas, utiliza dos seus livros para abordar vários pilares sociais, um de seus temas mais quentes é sobre a participação da mulher e como isso afeta a vida da mesma...",
    "theme": "A participação da mulher na sociedade brasileira"
  }'
 ⁠

*Response:*
⁠ json
{
  "nota_total": "820",
  "competencia_1": {
    "nota": "160",
    "titulo": "Demonstrar domínio da modalidade escrita formal da língua portuguesa",
    "feedback": "Sua redação apresenta boa adequação à modalidade escrita formal...",
    "aspectos_positivos": ["Uso correto da norma culta", "Vocabulário adequado"],
    "aspectos_melhorar": ["Atenção a alguns desvios pontuais"]
  },
  "competencia_2": {
    "nota": "180",
    "titulo": "Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento",
    "feedback": "O texto demonstra excelente compreensão do tema...",
    "aspectos_positivos": ["Desenvolvimento claro do tema"],
    "aspectos_melhorar": ["Maior profundidade na análise"]
  },
  "competencia_3": {
    "nota": "160",
    "titulo": "Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos",
    "feedback": "A argumentação está bem estruturada...",
    "aspectos_positivos": ["Organização clara das ideias"],
    "aspectos_melhorar": ["Mais exemplos concretos"]
  },
  "competencia_4": {
    "nota": "160",
    "titulo": "Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação",
    "feedback": "Bom uso de conectivos...",
    "aspectos_positivos": ["Coesão adequada"],
    "aspectos_melhorar": ["Variar mais os conectivos"]
  },
  "competencia_5": {
    "nota": "160",
    "titulo": "Elaborar proposta de intervenção para o problema abordado",
    "feedback": "A proposta de intervenção está presente...",
    "aspectos_positivos": ["Proposta viável"],
    "aspectos_melhorar": ["Detalhar melhor os responsáveis"]
  },
  "feedback_geral": "Sua redação demonstra domínio das competências avaliadas com alguns pontos de melhoria...",
  "pontos_fortes": [
    "Compreensão adequada do tema",
    "Boa estruturação argumentativa",
    "Linguagem formal apropriada"
  ],
  "pontos_melhorar": [
    "Aprofundar a análise crítica",
    "Incluir mais repertório sociocultural",
    "Detalhar melhor a proposta de intervenção"
  ]
}
 ⁠

---

## 🔄 Fluxo de Integração Recomendado

### Etapa 1: Processar OCR
⁠ javascript
const ocrResponse = await fetch('/essays/demo/process-ocr', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: textoOCRBruto
  })
});

const { correctedText, inferredTheme } = await ocrResponse.json();
 ⁠

### Etapa 2: Corrigir Redação
⁠ javascript
const correctionResponse = await fetch('/essays/demo/correct', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: correctedText,
    theme: inferredTheme
  })
});

const correction = await correctionResponse.json();
 ⁠

---

## 🛠️ Configuração do Ambiente

### Variáveis de Ambiente Necessárias
⁠ bash
OPENAI_COMPOSITIONS_API_KEY=sk-proj-xxxxx
OPENAI_COMPOSITIONS_ASSISTANT_ID=asst_xxxxx
 ⁠

### URL Base
•⁠  ⁠*Produção*: ⁠ https://api.trillo.app/compositions ⁠

---

## ⚡ Códigos de Status

| Status | Significado |
|--------|-------------|
| ⁠ 200 ⁠ | Sucesso |
| ⁠ 400 ⁠ | Dados inválidos no payload |
| ⁠ 500 ⁠ | Erro interno (problemas com OpenAI API) |

---

## 📋 Validações

### Rota 1 - Process OCR
•⁠  ⁠⁠ content ⁠: obrigatório, string não vazia

### Rota 2 - Correct
•⁠  ⁠⁠ content ⁠: obrigatório, string não vazia
•⁠  ⁠⁠ theme ⁠: obrigatório, string não vazia

---

## 🔒 Considerações de Segurança

•⁠  ⁠As rotas são *públicas* (não requerem autenticação)
•⁠  ⁠*Nenhum dado é salvo* no banco de dados
•⁠  ⁠Dados são processados apenas em memória
•⁠  ⁠Ideal apenas para *demonstrações*

---


### Performance
•⁠  ⁠*OCR Processing*: ~10-15 segundos
•⁠  ⁠*Essay Correction*: ~20-25 segundos
•⁠  ⁠*Total*: ~30-40 segundos (dependendo da complexidade)

---

## 📞 Suporte

Para dúvidas técnicas ou problemas de integração, entre em contato com a equipe de desenvolvimento.