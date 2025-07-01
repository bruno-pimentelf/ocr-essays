'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Eye, Download, Loader2, CheckCircle, AlertCircle, Edit3, Save, ZoomIn, X, Crop, RotateCcw } from 'lucide-react';

interface OCRResult {
  texto_completo: string;
  confianca: number;
  palavras_detectadas: number;
  status: string;
  tamanho_arquivo?: number;
  tipo_arquivo?: string;
  nome_arquivo?: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function OCRInterface() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [modalCanvasDimensions, setModalCanvasDimensions] = useState<{ width: number; height: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);

  // Efeito para controlar o ESC no zoom
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false);
        } else if (isCropping) {
          setIsCropping(false);
        }
      }
    };
    
    if (isZoomed || isCropping) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isZoomed, isCropping]);

  // Efeito para desenhar/limpar overlay quando cropArea muda
  useEffect(() => {
    if (cropArea && !isCropping) {
      // Desenhar overlay após confirmar seleção
      setTimeout(() => {
        drawCropAreaOnPreview();
      }, 100);
    }
  }, [cropArea, isCropping]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Tipo de arquivo não suportado. Use: JPG, PNG, BMP, TIFF ou WebP');
      return;
    }

    // Validar tamanho (máximo 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);
    setEditedText('');
    setIsEditing(false);
    setCropArea(null);
    setIsCropping(false);
    setIsDrawing(false);
    setStartPoint(null);
    
    // Limpar overlay anterior se existir
    setTimeout(() => {
      const img = imageRef.current;
      if (img && img.parentElement) {
        const existingOverlay = img.parentElement.querySelector('.crop-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }
      }
    }, 100);

    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const event = { target: { files: [droppedFile] } } as any;
      handleFileSelect(event);
    }
  }, [handleFileSelect]);

  const startCropSelection = () => {
    setIsCropping(true);
    setIsDrawing(false);
    setCropArea(null);
    setStartPoint(null);
    
    // Força a reinicialização do canvas no modal
    setTimeout(() => {
      initializeCropCanvas();
    }, 100);
  };

  const resetCrop = () => {
    setIsCropping(false);
    setCropArea(null);
    setIsDrawing(false);
    setStartPoint(null);
    
    // Remover overlay do preview
    const img = imageRef.current;
    if (img && img.parentElement) {
      const existingOverlay = img.parentElement.querySelector('.crop-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
    }
  };

  const confirmCrop = () => {
    if (!cropArea) {
      console.warn('Tentativa de confirmar sem área selecionada');
      return;
    }
    
    // Armazenar as dimensões do canvas do modal antes de fechar
    const modalCanvas = cropCanvasRef.current;
    if (modalCanvas) {
      setModalCanvasDimensions({
        width: modalCanvas.width,
        height: modalCanvas.height
      });
      console.log('Dimensões do modal armazenadas:', {
        width: modalCanvas.width,
        height: modalCanvas.height
      });
    }
    
    console.log('Confirmando área de crop:', cropArea);
    setIsCropping(false);
    setIsDrawing(false);
    setStartPoint(null);
    
    // Desenhar a área no preview principal após um pequeno delay
    setTimeout(() => {
      drawCropAreaOnPreview();
    }, 100);
  };

  const initializeCropCanvas = () => {
    setTimeout(() => {
      const canvas = cropCanvasRef.current;
      const image = cropImageRef.current;
      if (!canvas || !image || !image.complete) {
        console.log('Canvas ou imagem não prontos:', { canvas: !!canvas, image: !!image, complete: image?.complete });
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.log('Não foi possível obter contexto 2D');
        return;
      }

      // Calcular dimensões para tela cheia mantendo aspect ratio
      const screenWidth = Math.min(window.innerWidth - 100, 1400); // máximo de 1400px
      const screenHeight = Math.min(window.innerHeight - 200, 800); // máximo de 800px
      
      const imageAspectRatio = image.naturalWidth / image.naturalHeight;
      const screenAspectRatio = screenWidth / screenHeight;

      let drawWidth, drawHeight;
      if (imageAspectRatio > screenAspectRatio) {
        drawWidth = screenWidth;
        drawHeight = screenWidth / imageAspectRatio;
      } else {
        drawHeight = screenHeight;
        drawWidth = screenHeight * imageAspectRatio;
      }

      // Configurar canvas - IMPORTANTE: definir dimensões físicas primeiro
      canvas.width = drawWidth;
      canvas.height = drawHeight;
      
      // Aplicar estilo CSS depois
      canvas.style.width = `${drawWidth}px`;
      canvas.style.height = `${drawHeight}px`;
      canvas.style.display = 'block';
      
      // Desenhar a imagem
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, drawWidth, drawHeight);
      
      console.log('Canvas inicializado:', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        imageWidth: image.naturalWidth,
        imageHeight: image.naturalHeight,
        drawWidth,
        drawHeight
      });
    }, 150);
  };

  const getCropEventCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Coordenadas relativas ao canvas (de 0 a canvas.width/height)
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    
    // Garantir que as coordenadas estão dentro dos limites
    const clampedX = Math.max(0, Math.min(canvas.width, x));
    const clampedY = Math.max(0, Math.min(canvas.height, y));
    
    return { x: clampedX, y: clampedY };
  };

  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping) return;
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCropEventCoordinates(e);
    if (!coords) return;
    
    console.log('Mouse down:', coords);
    setStartPoint(coords);
    setIsDrawing(true);
    setCropArea(null);
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !isDrawing || !startPoint) return;
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCropEventCoordinates(e);
    if (!coords) return;
    
    const newCropArea: CropArea = {
      x: Math.min(startPoint.x, coords.x),
      y: Math.min(startPoint.y, coords.y),
      width: Math.abs(coords.x - startPoint.x),
      height: Math.abs(coords.y - startPoint.y)
    };
    
    console.log('Mouse move - Nova área:', newCropArea);
    setCropArea(newCropArea);
    drawCropAreaOnCanvas(newCropArea);
  };

  const handleCropMouseUp = (e?: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping) return;
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('Mouse up');
    setIsDrawing(false);
  };

  const handleCropTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isCropping || e.touches.length !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCropEventCoordinates(e);
    if (!coords) return;
    
    console.log('Touch start:', coords);
    setStartPoint(coords);
    setIsDrawing(true);
    setCropArea(null);
  };

  const handleCropTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isCropping || !isDrawing || !startPoint || e.touches.length !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCropEventCoordinates(e);
    if (!coords) return;
    
    const newCropArea: CropArea = {
      x: Math.min(startPoint.x, coords.x),
      y: Math.min(startPoint.y, coords.y),
      width: Math.abs(coords.x - startPoint.x),
      height: Math.abs(coords.y - startPoint.y)
    };
    
    console.log('Touch move - Nova área:', newCropArea);
    setCropArea(newCropArea);
    drawCropAreaOnCanvas(newCropArea);
  };

  const handleCropTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isCropping) return;
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Touch end');
    setIsDrawing(false);
  };

  const drawCropAreaOnCanvas = (area: CropArea) => {
    const canvas = cropCanvasRef.current;
    const image = cropImageRef.current;
    if (!canvas || !image) {
      console.log('Canvas ou imagem não disponíveis para desenhar');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('Contexto 2D não disponível');
      return;
    }

    console.log('Desenhando área:', area);

    // Limpar canvas e redesenhar imagem
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    // Validar área mínima
    if (area.width < 5 || area.height < 5) {
      console.log('Área muito pequena para desenhar');
      return;
    }
    
    // Desenhar overlay escuro
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Limpar área selecionada (fazer transparente)
    ctx.clearRect(area.x, area.y, area.width, area.height);
    
    // Redesenhar a imagem na área selecionada
    const sourceX = (area.x / canvas.width) * image.naturalWidth;
    const sourceY = (area.y / canvas.height) * image.naturalHeight;
    const sourceWidth = (area.width / canvas.width) * image.naturalWidth;
    const sourceHeight = (area.height / canvas.height) * image.naturalHeight;
    
    ctx.drawImage(
      image,
      sourceX, sourceY, sourceWidth, sourceHeight,
      area.x, area.y, area.width, area.height
    );
    
    // Desenhar borda da seleção
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.strokeRect(area.x, area.y, area.width, area.height);
    
    // Adicionar pontos de controle nos cantos
    const cornerSize = 12;
    ctx.fillStyle = '#10b981';
    
    // Cantos
    ctx.fillRect(area.x - cornerSize/2, area.y - cornerSize/2, cornerSize, cornerSize);
    ctx.fillRect(area.x + area.width - cornerSize/2, area.y - cornerSize/2, cornerSize, cornerSize);
    ctx.fillRect(area.x - cornerSize/2, area.y + area.height - cornerSize/2, cornerSize, cornerSize);
    ctx.fillRect(area.x + area.width - cornerSize/2, area.y + area.height - cornerSize/2, cornerSize, cornerSize);
    
    // Adicionar texto com dimensões
    ctx.fillStyle = '#10b981';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText(
      `${Math.round(area.width)}×${Math.round(area.height)}px`, 
      area.x + 5, 
      area.y - 5
    );
  };

  const cropImageToBlob = async (): Promise<Blob | null> => {
    if (!preview || !cropArea) {
      console.error('Preview ou cropArea não disponíveis');
      return null;
    }

    // Usar a imagem principal
    const img = imageRef.current;
    if (!img || !img.complete) {
      console.error('Imagem principal não carregada');
      return null;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Não foi possível obter contexto 2D para crop');
      return null;
    }

    // Usar a mesma lógica de conversão do preview
    if (!modalCanvasDimensions) {
      console.error('Dimensões do modal não disponíveis para conversão no processamento');
      return null;
    }

    console.log('Processando crop:', {
      cropArea,
      imageNaturalWidth: img.naturalWidth,
      imageNaturalHeight: img.naturalHeight,
      modalCanvasDimensions
    });

    // MESMA LÓGICA DO PREVIEW:
    // Escala do canvas do modal para a imagem natural
    const modalToImageScaleX = img.naturalWidth / modalCanvasDimensions.width;
    const modalToImageScaleY = img.naturalHeight / modalCanvasDimensions.height;

    // Coordenadas na imagem natural (exatamente como no preview)
    const imageX = cropArea.x * modalToImageScaleX;
    const imageY = cropArea.y * modalToImageScaleY;
    const imageWidth = cropArea.width * modalToImageScaleX;
    const imageHeight = cropArea.height * modalToImageScaleY;

    // Garantir que as coordenadas estão dentro dos limites da imagem
    const cropX = Math.max(0, Math.round(imageX));
    const cropY = Math.max(0, Math.round(imageY));
    const cropWidth = Math.min(Math.round(imageWidth), img.naturalWidth - cropX);
    const cropHeight = Math.min(Math.round(imageHeight), img.naturalHeight - cropY);

    console.log('Coordenadas de crop calculadas (mesma lógica do preview):', {
      cropX, cropY, cropWidth, cropHeight,
      modalToImageScaleX, modalToImageScaleY,
      imageCoords: { imageX, imageY, imageWidth, imageHeight }
    });

    // Validar se a área é válida
    if (cropWidth <= 0 || cropHeight <= 0) {
      console.error('Área de crop inválida:', { cropWidth, cropHeight });
      return null;
    }

    // Configurar canvas para a área cropada
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Desenhar a área cropada
    try {
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,  // área de origem na imagem
        0, 0, cropWidth, cropHeight           // destino no canvas
      );
      
      console.log('Imagem cropada com sucesso - dimensões finais:', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });
    } catch (error) {
      console.error('Erro ao desenhar imagem cropada:', error);
      return null;
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('Blob criado com sucesso:', { size: blob.size, type: blob.type });
        } else {
          console.error('Falha ao criar blob');
        }
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  // Função para desenhar a área selecionada no preview principal
  const drawCropAreaOnPreview = () => {
    if (!cropArea || !imageRef.current) return;

    const img = imageRef.current;
    const container = img.parentElement;
    if (!container) return;

    // Remover overlay anterior se existir
    const existingOverlay = container.querySelector('.crop-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Calcular as dimensões da imagem no preview (400px altura máxima)
    const containerRect = container.getBoundingClientRect();
    const imageAspectRatio = img.naturalWidth / img.naturalHeight;
    
    // Como o preview usa object-contain com altura de 400px
    let previewWidth, previewHeight;
    const maxHeight = 400;
    const maxWidth = containerRect.width;
    
    if (imageAspectRatio > (maxWidth / maxHeight)) {
      // Imagem é mais larga, limitada pela largura
      previewWidth = maxWidth;
      previewHeight = maxWidth / imageAspectRatio;
    } else {
      // Imagem é mais alta, limitada pela altura
      previewHeight = maxHeight;
      previewWidth = maxHeight * imageAspectRatio;
    }

    // Calcular o offset para centralizar a imagem no container
    const offsetX = (containerRect.width - previewWidth) / 2;
    const offsetY = (maxHeight - previewHeight) / 2;

    // Agora precisamos converter as coordenadas do modal para o preview
    // Primeiro, converter cropArea (coordenadas do canvas do modal) para coordenadas da imagem natural
    if (!modalCanvasDimensions) {
      console.warn('Dimensões do modal não disponíveis para conversão');
      return;
    }

    // Escala do canvas do modal para a imagem natural
    const modalToImageScaleX = img.naturalWidth / modalCanvasDimensions.width;
    const modalToImageScaleY = img.naturalHeight / modalCanvasDimensions.height;

    // Coordenadas na imagem natural
    const imageX = cropArea.x * modalToImageScaleX;
    const imageY = cropArea.y * modalToImageScaleY;
    const imageWidth = cropArea.width * modalToImageScaleX;
    const imageHeight = cropArea.height * modalToImageScaleY;

    // Escala da imagem natural para o preview
    const imageToPreviewScaleX = previewWidth / img.naturalWidth;
    const imageToPreviewScaleY = previewHeight / img.naturalHeight;

    // Coordenadas finais no preview
    const overlayX = offsetX + (imageX * imageToPreviewScaleX);
    const overlayY = offsetY + (imageY * imageToPreviewScaleY);
    const overlayWidth = imageWidth * imageToPreviewScaleX;
    const overlayHeight = imageHeight * imageToPreviewScaleY;

    console.log('Conversão de coordenadas:', {
      original: cropArea,
      containerRect: { width: containerRect.width, height: maxHeight },
      previewDimensions: { previewWidth, previewHeight },
      offsets: { offsetX, offsetY },
      modalCanvas: modalCanvasDimensions,
      imageNatural: { width: img.naturalWidth, height: img.naturalHeight },
      imageCoords: { imageX, imageY, imageWidth, imageHeight },
      scales: { 
        modalToImageScaleX, modalToImageScaleY,
        imageToPreviewScaleX, imageToPreviewScaleY 
      },
      finalOverlay: { overlayX, overlayY, overlayWidth, overlayHeight }
    });

    // Criar elemento overlay
    const overlay = document.createElement('div');
    overlay.className = 'crop-overlay';
    overlay.style.position = 'absolute';
    overlay.style.left = `${overlayX}px`;
    overlay.style.top = `${overlayY}px`;
    overlay.style.width = `${overlayWidth}px`;
    overlay.style.height = `${overlayHeight}px`;
    overlay.style.border = '3px solid #10b981';
    overlay.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '10';
    overlay.style.borderRadius = '4px';

    // Adicionar label com informações
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.top = '-24px';
    label.style.left = '0px';
    label.style.backgroundColor = '#10b981';
    label.style.color = 'white';
    label.style.padding = '2px 6px';
    label.style.borderRadius = '3px';
    label.style.fontSize = '10px';
    label.style.fontWeight = 'bold';
    label.style.whiteSpace = 'nowrap';
    label.textContent = `${Math.round(imageWidth)}×${Math.round(imageHeight)}px`;
    
    overlay.appendChild(label);

    container.style.position = 'relative';
    container.appendChild(overlay);
  };

  const processOCR = async () => {
    if (!file) {
      setError('Selecione uma imagem primeiro');
      return;
    }

    if (!cropArea) {
      setError('Selecione uma área da redação primeiro');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      // Sempre usar imagem cortada
      const croppedBlob = await cropImageToBlob();
      if (croppedBlob) {
        formData.append('file', croppedBlob, file.name);
      } else {
        throw new Error('Erro ao processar a área selecionada');
      }

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao processar a imagem');
      }

      setResult(data.data);
      setEditedText(data.data.texto_completo);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = () => {
    if (result) {
      setResult({
        ...result,
        texto_completo: editedText
      });
      setIsEditing(false);
    }
  };

  const downloadResult = () => {
    if (!result) return;

    const textToDownload = isEditing ? editedText : result.texto_completo;

    const content = `
REDAÇÃO EXTRAÍDA - OCR GOOGLE VISION
====================================

Status: ${result.status}
Palavras detectadas: ${result.palavras_detectadas}
Confiança média: ${result.confianca}%
Idioma configurado: Português Brasileiro (pt)
${result.nome_arquivo ? `Arquivo original: ${result.nome_arquivo}` : ''}
${result.tamanho_arquivo ? `Tamanho: ${(result.tamanho_arquivo / 1024).toFixed(1)} KB` : ''}

------------------------------------

TEXTO EXTRAÍDO:

${textToDownload}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'redacao_extraida.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getQualityBadge = (confianca: number) => {
    if (confianca >= 90) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Excelente qualidade</Badge>;
    } else if (confianca >= 75) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Boa qualidade</Badge>;
    } else if (confianca >= 60) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Qualidade moderada</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Qualidade baixa</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Redações ENEM com IA</h1>
        <p className="text-muted-foreground">
          Extração de texto de redações manuscritas com OCR
        </p>
      </div>

      {/* Upload e Preview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload da Imagem
            </CardTitle>
            <CardDescription>
              Envie uma imagem da redação manuscrita
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Arraste uma imagem aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground">
                Máximo 10MB • JPG, PNG, BMP, TIFF, WebP
              </p>
            </div>

            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file && (
              <div className="space-y-2">
                <Label>Arquivo selecionado:</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              </div>
            )}

            {preview && (
              <div className="space-y-2">
                <Label>Seleção de área:</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={startCropSelection}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Crop className="h-4 w-4" />
                    {cropArea ? 'Alterar seleção' : 'Selecionar área'}
                  </Button>
                  {cropArea && (
                    <Button
                      onClick={resetCrop}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Resetar
                    </Button>
                  )}
                </div>
                {cropArea ? (
                  <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                    ✅ Área selecionada - pronto para extrair texto
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    ⚠️ Selecione a área da redação antes de processar
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={processOCR}
              disabled={!file || loading || !cropArea}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando área selecionada...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Extrair Texto da Área
                </>
              )}
            </Button>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview da Imagem
            </CardTitle>
            <CardDescription>
              Visualização da imagem que será processada • Clique para ampliar
            </CardDescription>
          </CardHeader>
                      <CardContent>
              {preview ? (
                <div className="relative border rounded-lg overflow-hidden bg-muted group">
                  <img
                    ref={imageRef}
                    src={preview}
                    alt="Preview"
                    className="w-full h-[400px] object-contain cursor-pointer transition-transform hover:scale-[1.02]"
                    onClick={() => setIsZoomed(true)}
                  />
                  {/* Indicador de zoom */}
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="h-3 w-3" />
                    Clique para ampliar
                  </div>
                  
                  {/* Indicador de área selecionada */}
                  {cropArea && (
                    <div className="absolute top-2 left-2 bg-green-600 text-white px-3 py-1 rounded-md text-xs flex items-center gap-1">
                      <Crop className="h-3 w-3" />
                      Área selecionada ({Math.round(cropArea.width)}×{Math.round(cropArea.height)})
                    </div>
                  )}
                  
                  {/* Animação de escaneamento */}
                  {loading && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="relative w-full h-full">
                        {/* Linha de scan animada */}
                        <div className="absolute w-full h-0.5 bg-blue-500 shadow-lg animate-scan-line">
                          <div className="absolute inset-0 bg-blue-400 blur-sm"></div>
                        </div>
                        {/* Overlay com efeito de scan */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent animate-scan-overlay"></div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/70 rounded-lg px-4 py-2 text-white text-sm font-medium flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Escaneando área selecionada...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg h-[400px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">Nenhuma imagem selecionada</p>
                    <p className="text-sm">Faça upload de uma imagem para ver o preview</p>
                  </div>
                </div>
              )}
            </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resultado do OCR
            </CardTitle>
            <CardDescription>
              Texto extraído e estatísticas de qualidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  CONFIANÇA
                </Label>
                <div className="flex items-center gap-2">
                  <Progress value={result.confianca} className="flex-1" />
                  <span className="text-sm font-medium">{result.confianca}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  PALAVRAS
                </Label>
                <div className="text-2xl font-bold">{result.palavras_detectadas}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  QUALIDADE
                </Label>
                <div>{getQualityBadge(result.confianca)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  AÇÕES
                </Label>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <Button
                      onClick={handleSaveEdit}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Salvar
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </Button>
                  )}
                  <Button
                    onClick={downloadResult}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Baixar
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Texto Extraído:</Label>
                {isEditing && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Edit3 className="h-3 w-3" />
                    Modo de edição ativo
                  </span>
                )}
              </div>
              <Textarea
                value={isEditing ? editedText : result.texto_completo}
                onChange={(e) => isEditing && setEditedText(e.target.value)}
                readOnly={!isEditing}
                className={`min-h-[400px] font-mono text-sm transition-all duration-200 ${
                  isEditing 
                    ? 'border-blue-300 bg-blue-50/30 focus:border-blue-500' 
                    : 'bg-muted/30'
                }`}
                placeholder="O texto extraído aparecerá aqui..."
              />
            </div>

            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {result.status} • {result.palavras_detectadas} palavras detectadas
                {isEditing && " • Editando texto extraído"}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Modal de Zoom */}
      {isZoomed && preview && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          {/* Botão de fechar */}
          <Button
            onClick={() => setIsZoomed(false)}
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 bg-white/10 border-white/20 text-white hover:bg-white/20 z-10"
          >
            <X className="h-4 w-4" />
          </Button>
          
          {/* Instruções */}
          <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-2 rounded-md">
            Pressione ESC ou clique fora para fechar
          </div>
          
          {/* Imagem ampliada */}
          <img
            src={preview}
            alt="Preview ampliado"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modal de Seleção de Área - Tela Cheia */}
      {isCropping && preview && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
          {/* Header do Modal */}
          <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
            <div className="text-white">
              <h3 className="text-lg font-semibold">Selecionar Área da Redação</h3>
              <p className="text-sm text-gray-300">Arraste para selecionar a área com o texto manuscrito</p>
            </div>
            <div className="flex items-center gap-2">
              {cropArea && (
                <Button
                  onClick={confirmCrop}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Seleção
                </Button>
              )}
              <Button
                onClick={() => setIsCropping(false)}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Área de Crop */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="relative" style={{ userSelect: 'none' }}>
              <img
                ref={cropImageRef}
                src={preview}
                alt="Imagem para crop"
                className="opacity-0 absolute pointer-events-none"
                onLoad={initializeCropCanvas}
                onError={(e) => console.error('Erro ao carregar imagem:', e)}
              />
              <canvas
                ref={cropCanvasRef}
                className="cursor-crosshair touch-none border border-white/20 rounded-lg"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                onMouseLeave={() => handleCropMouseUp()}
                onTouchStart={handleCropTouchStart}
                onTouchMove={handleCropTouchMove}
                onTouchEnd={handleCropTouchEnd}
                onTouchCancel={() => handleCropTouchEnd({} as React.TouchEvent<HTMLCanvasElement>)}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                onClick={(e) => {
                  console.log('Canvas clicado!', { 
                    clientX: e.clientX, 
                    clientY: e.clientY,
                    canvasWidth: cropCanvasRef.current?.width,
                    canvasHeight: cropCanvasRef.current?.height
                  });
                }}
              />
                             
               {/* Info da área selecionada */}
               {cropArea && (
                 <div className="absolute top-2 right-2 bg-green-600/90 text-white p-2 rounded text-xs">
                   <div className="font-semibold">✅ Área Selecionada</div>
                   <div>Tamanho: {Math.round(cropArea.width)}×{Math.round(cropArea.height)}px</div>
                 </div>
               )}
            </div>
          </div>

          {/* Footer com instruções */}
          <div className="p-4 bg-black/50 backdrop-blur-sm">
            <div className="text-white text-sm space-y-2">
              <div className="text-center">
                {!cropArea ? (
                  <>
                    <p className="text-gray-300">🖱️ <strong>Arraste</strong> para selecionar a área da redação</p>
                    <p className="text-gray-400">💡 Foque apenas no texto manuscrito, ignorando cabeçalhos e numeração</p>
                  </>
                ) : (
                  <>
                    <p className="text-green-300">✅ <strong>Área selecionada!</strong> Clique em "Confirmar Seleção" para continuar</p>
                    <p className="text-gray-400">🔄 Ou arraste novamente para ajustar a seleção</p>
                  </>
                )}
                <p className="text-gray-500">⌨️ Pressione ESC para cancelar</p>
              </div>
              
              {/* Status info */}
              <div className="flex justify-center text-xs text-gray-400 border-t border-white/10 pt-2">
                <div>
                  {isDrawing ? '🔵 Selecionando área...' : '⚪ Pronto para selecionar'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 