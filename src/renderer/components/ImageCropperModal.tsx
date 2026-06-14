import React, { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperModalProps {
  imageUrl: string;
  initialCropData?: any;
  aspectRatio?: number;
  circularCrop?: boolean;
  onSave: (croppedBase64: string, originalRawBase64: string, cropData: any) => void;
  onCancel: () => void;
  imageType?: 'image/png' | 'image/webp' | 'image/jpeg';
  imageQuality?: number;
}

export function ImageCropperModal({
  imageUrl,
  initialCropData,
  aspectRatio,
  circularCrop,
  onSave,
  onCancel,
  imageType = 'image/png',
  imageQuality
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [localImageUrl, setLocalImageUrl] = useState(imageUrl);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;

    if (initialCropData && localImageUrl === imageUrl) {
      setCrop(initialCropData);
      setCompletedCrop(initialCropData);
      return;
    }

    let initialCrop: Crop;
    
    if (aspectRatio) {
      initialCrop = centerCrop(
        makeAspectCrop(
          { unit: '%', width: 90 },
          aspectRatio,
          width,
          height
        ),
        width,
        height
      );
    } else {
      initialCrop = {
        unit: '%',
        width: 90,
        height: 90,
        x: 5,
        y: 5
      };
    }
    setCrop(initialCrop);
  };

  const handleSave = () => {
    if (!completedCrop || !imgRef.current) return;
    const canvas = document.createElement('canvas');
    const image = imgRef.current;
    
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Se for circular, podemos aplicar um path de clip (opcional, o ReactCrop visual já mostra, 
    // mas se quisermos fundo transparente na imagem final circular, precisamos desenhar o clip)
    if (circularCrop) {
      ctx.beginPath();
      ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        Math.min(canvas.width, canvas.height) / 2,
        0,
        2 * Math.PI
      );
      ctx.clip();
    }

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const quality = imageQuality !== undefined ? imageQuality : (imageType === 'image/png' ? undefined : 0.8);
    const base64 = canvas.toDataURL(imageType, quality);
    onSave(base64, localImageUrl, completedCrop);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        if (typeof reader.result === 'string') {
          setLocalImageUrl(reader.result);
        }
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-codex-surface border border-codex-border rounded-lg p-5 flex flex-col max-h-[90vh] max-w-4xl w-full shadow-2xl overflow-hidden">
        <h3 className="font-heading text-xl text-gold-primary mb-4 border-b border-codex-border pb-2 shrink-0">Ajustar Enquadramento</h3>
        
        {/* Área do crop — flex-1 + min-h-0 garante que não extrapola a altura do modal */}
        <div className="flex-1 min-h-0 overflow-auto bg-codex-bg rounded border border-codex-border flex items-center justify-center p-4">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            circularCrop={circularCrop}
          >
            <img
              ref={imgRef}
              src={localImageUrl}
              alt="Crop"
              style={{ maxHeight: '58vh', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
              onLoad={onImageLoad}
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>
        
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-codex-border bg-codex-bg">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary mr-auto"
          >
            Trocar Imagem
          </button>
          <button
            type="button"
            onClick={onCancel} className="btn-secondary py-2 px-4">Cancelar</button>
          <button onClick={handleSave} className="btn-primary py-2 px-6" disabled={!completedCrop}>
            💾 Salvar Enquadramento
          </button>
        </div>
      </div>
    </div>
  );
}
