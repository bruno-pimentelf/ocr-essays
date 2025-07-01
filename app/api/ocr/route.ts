import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Configurar as credenciais do Google Cloud a partir das variáveis de ambiente
const credentials = {
  type: 'service_account',
  project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
  private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLOUD_CLIENT_EMAIL}`,
  universe_domain: 'googleapis.com'
};

// Configurar o cliente do Google Vision com as credenciais
const visionClient = new ImageAnnotatorClient({
  credentials: credentials,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

export async function POST(request: NextRequest) {
  try {
    // Obter o arquivo da requisição
    const data = await request.formData();
    const file = data.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo foi enviado' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Use: JPG, PNG, BMP, TIFF ou WebP' },
        { status: 400 }
      );
    }

    // Converter o arquivo para buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Configurar a requisição para o Google Vision
    // Usando as mesmas configurações do Python
    const visionRequest = {
      image: {
        content: buffer,
      },
      imageContext: {
        languageHints: ['pt'], // Português brasileiro
      },
    };

    // Chamar a API Vision com DOCUMENT_TEXT_DETECTION
    // (otimizado para textos densos como no script Python)
    const [result] = await visionClient.documentTextDetection(visionRequest);
    
    // Verificar se houve erro
    if (result.error) {
      throw new Error(`Erro na API Vision: ${result.error.message}`);
    }

    const detections = result.textAnnotations || [];
    const document = result.fullTextAnnotation;

    if (!detections.length) {
      return NextResponse.json({
        success: true,
        data: {
          texto_completo: '',
          confianca: 0,
          palavras_detectadas: 0,
          status: 'Nenhum texto detectado',
        }
      });
    }

    // Extrair o texto completo (primeiro elemento contém todo o texto)
    const textoCompleto = detections[0].description || '';

    // Calcular estatísticas como no Python
    let totalPalavras = 0;
    let somaConfianca = 0;

    if (document?.pages) {
      for (const page of document.pages) {
        for (const block of page.blocks || []) {
          for (const paragraph of block.paragraphs || []) {
            for (const word of paragraph.words || []) {
              totalPalavras++;
              somaConfianca += word.confidence || 0;
            }
          }
        }
      }
    }

    const confiancaMedia = totalPalavras > 0 ? (somaConfianca / totalPalavras) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        texto_completo: textoCompleto,
        confianca: Math.round(confiancaMedia * 100) / 100,
        palavras_detectadas: totalPalavras,
        status: 'Texto extraído com sucesso',
        tamanho_arquivo: file.size,
        tipo_arquivo: file.type,
        nome_arquivo: file.name,
      }
    });

  } catch (error) {
    console.error('Erro no OCR:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar a imagem' 
      },
      { status: 500 }
    );
  }
} 