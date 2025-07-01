# OCR para Redações ENEM - Next.js

Aplicação web para extrair texto de redações manuscritas usando Google Vision API, construída com Next.js e shadcn/ui.

## 🚀 Configuração

### 1. Pré-requisitos

- Node.js 18+ 
- Conta no Google Cloud Platform
- Projeto no Google Cloud com Vision API habilitada
- Arquivo de credenciais JSON do Google Cloud

### 2. Configuração do Google Cloud

#### 2.1 Criar projeto e habilitar Vision API
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Habilite a Vision API:
   - Vá para "APIs e serviços" > "Biblioteca"
   - Procure por "Vision API" 
   - Clique em "ATIVAR"

#### 2.2 Criar credenciais
1. Vá para "APIs e serviços" > "Credenciais"
2. Clique em "+ CRIAR CREDENCIAIS" > "Chave da conta de serviço"
3. Se necessário, crie uma nova conta de serviço:
   - Nome: "ocr-redacoes"
   - Papel: "Cloud Vision API Service Agent"
4. Baixe o arquivo JSON das credenciais
5. Salve o arquivo na pasta raiz do projeto

### 3. Instalação

```bash
# Clonar o repositório (se aplicável)
git clone <url-do-repo>
cd redacao

# Instalar dependências
npm install
# ou
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env.local
```

### 4. Configuração de ambiente

Edite o arquivo `.env.local` e configure:

```env
GOOGLE_APPLICATION_CREDENTIALS=./caminho/para/seu/arquivo-credenciais.json
```

**Importante**: Substitua pelo caminho real do seu arquivo de credenciais JSON.

### 5. Executar a aplicação

```bash
npm run dev
# ou
pnpm dev
```

Acesse: http://localhost:3000

## 📱 Como usar

1. **Upload da imagem**: Arraste e solte ou clique para selecionar uma imagem da redação
2. **Tipos suportados**: JPG, PNG, BMP, TIFF, WebP (máximo 10MB)
3. **Processamento**: Clique em "Extrair Texto" para processar
4. **Resultado**: Visualize o texto extraído, estatísticas de qualidade e confiança
5. **Download**: Baixe o resultado em formato TXT

## 🎯 Funcionalidades

- ✅ Interface drag-and-drop para upload
- ✅ Preview da imagem selecionada
- ✅ OCR otimizado para texto manuscrito denso
- ✅ Configuração automática para português brasileiro
- ✅ Cálculo de confiança e estatísticas
- ✅ Indicadores visuais de qualidade
- ✅ Download dos resultados em TXT
- ✅ Interface responsiva e moderna
- ✅ Componentes shadcn/ui

## 🛠️ Tecnologias

- **Next.js 15** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **Google Vision API** - OCR
- **Lucide React** - Ícones

## 📊 Qualidade do OCR

A aplicação classifica automaticamente a qualidade do reconhecimento:

- **Excelente** (≥90%): Texto muito bem reconhecido
- **Boa** (≥75%): Texto bem reconhecido
- **Moderada** (≥60%): Revisar resultado recomendado
- **Baixa** (<60%): Considerar melhorar qualidade da imagem

## 🚨 Solução de problemas

### Erro de autenticação
- Verifique se o arquivo de credenciais existe
- Confirme se o caminho em `GOOGLE_APPLICATION_CREDENTIALS` está correto
- Certifique-se de que a Vision API está habilitada no projeto

### Erro ao processar imagem
- Verifique se o arquivo é um formato suportado
- Confirme se o arquivo não ultrapassa 10MB
- Teste com uma imagem de boa qualidade

### Qualidade baixa do OCR
- Use imagens com resolução mínima de 300 DPI
- Certifique-se de boa iluminação sem sombras
- Evite texto muito pequeno ou borrado
- Use fundo claro com texto escuro

## 📄 Estrutura do projeto

```
redacao/
├── app/
│   ├── api/ocr/route.ts     # API endpoint
│   ├── globals.css          # Estilos globais
│   ├── layout.tsx           # Layout principal
│   └── page.tsx             # Página inicial
├── components/
│   ├── ui/                  # Componentes shadcn/ui
│   └── ocr-interface.tsx    # Interface principal
├── lib/
│   └── utils.ts             # Utilitários
└── ...
```

## 🔗 Links úteis

- [Documentação Google Vision API](https://cloud.google.com/vision/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
