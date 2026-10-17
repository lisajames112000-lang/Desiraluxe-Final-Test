import React, { useEffect, useState } from 'react';
import { ImageOffIcon } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

export function ImageWithFallback({ containerClassName = '', className = '', alt, ...props }: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [props.src]);
  if (failed || !props.src) {
    return (
      <div className={`flex items-center justify-center bg-sage text-emerald-muted ${containerClassName}`} role="img" aria-label={`${alt || 'Image'} unavailable`}>
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <ImageOffIcon size={28} aria-hidden="true" />
          <span className="text-xs font-medium">Image unavailable</span>
        </div>
      </div>);

  }
  return <img {...props} alt={alt} className={className} onError={() => setFailed(true)} />;
}