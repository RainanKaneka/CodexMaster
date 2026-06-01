import React, { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperModalProps {
  imageUrl: string;
  aspectRatio?: number;
  circularCrop?: boolean;
  onSave: (base64: string) => void;
  onCancel: () => void;
}

export function ImageCropperModal({
  imageUrl,
  aspectRatio,
  circularCrop,
  onSave,
  onCancel,
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
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

    const base64 = canvas.toDataURL('image/png');
    onSave(base64);
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
              src={imageUrl}
              alt="Crop"
              style={{ maxHeight: '58vh', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
              onLoad={onImageLoad}
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>
        
        <div className="flex gap-3 justify-end mt-5 shrink-0">
          <button onClick={onCancel} className="btn-secondary py-2 px-4">Cancelar</button>
          <button onClick={handleSave} className="btn-primary py-2 px-6" disabled={!completedCrop}>
            💾 Salvar Enquadramento
          </button>
        </div>
      </div>
    </div>
  );
}
