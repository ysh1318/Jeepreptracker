import React, { useState, useEffect } from 'react';

// Cache to store processed transparent data URLs so we don't repeat canvas work
const transparentCache: Record<string, string> = {};

export const useTransparentBadge = (imgUrl?: string) => {
  const [transparentUrl, setTransparentUrl] = useState<string>('');

  useEffect(() => {
    if (!imgUrl) {
      setTransparentUrl('');
      return;
    }

    if (transparentCache[imgUrl]) {
      setTransparentUrl(transparentCache[imgUrl]);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setTransparentUrl(imgUrl);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Loop through all pixels and key out the black background
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Key out pixels where R, G, B are all very dark (below threshold)
          if (r < 32 && g < 32 && b < 32) {
            data[i + 3] = 0; // Fully transparent alpha
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        transparentCache[imgUrl] = dataUrl;
        setTransparentUrl(dataUrl);
      } catch (err) {
        console.warn("Canvas transparency processing failed (using fallback image):", err);
        setTransparentUrl(imgUrl);
      }
    };
    img.onerror = () => {
      setTransparentUrl(imgUrl);
    };
    img.src = imgUrl;
  }, [imgUrl]);

  return transparentUrl || imgUrl;
};

interface TransparentBadgeImageProps {
  src?: string;
  alt: string;
  className?: string;
  rankTitle?: string;
}

export const TransparentBadgeImage = ({ src, alt, className = '', rankTitle = 'Bronze' }: TransparentBadgeImageProps) => {
  const transparentSrc = useTransparentBadge(src);

  const getAnimationClass = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('grandmaster')) return 'badge-grandmaster';
    if (t.includes('heroic')) return 'badge-heroic';
    if (t.includes('diamond')) return 'badge-diamond';
    if (t.includes('platinum')) return 'badge-platinum';
    if (t.includes('gold')) return 'badge-gold';
    if (t.includes('silver')) return 'badge-silver';
    return 'badge-bronze';
  };

  const animClass = getAnimationClass(rankTitle);
  // combine the custom animation styles, glint effect, and passed Tailwind class
  const combinedClass = `${animClass} badge-glint ${className}`.trim();

  return <img src={transparentSrc} alt={alt} className={combinedClass} />;
};
