import React from 'react';
import { Alert, Stack, Text } from '@mantine/core';
import { MediaUploader } from './MediaUploader';

interface ProductMediaManagerProps {
  entityId: string;
  productName: string;
  images: string[];
  videoUrl?: string;
  onImagesChange: (images: string[]) => void;
  onVideoChange: (videoUrl?: string) => void;
}

export function ProductMediaManager({
  entityId,
  productName,
  images,
  videoUrl,
  onImagesChange,
  onVideoChange
}: ProductMediaManagerProps) {
  const isSampleGallery = images.length > 0 && images.every((image) => image.startsWith('data:image/'));
  const updateImage = (index: number, url: string) => {
    if (url && isSampleGallery) {onImagesChange([url]);return;}
    const next = [...images];
    if (url) next[index] = url;else
    next.splice(index, 1);
    onImagesChange(Array.from(new Set(next.filter(Boolean))));
  };

  const addImage = (url: string) => {
    if (!url || images.includes(url)) return;
    onImagesChange(isSampleGallery ? [url] : [...images, url]);
  };

  return (
    <Stack gap="md">
      <div>
        <Text fw={700}>Product gallery</Text>
        <Text size="xs" c="dimmed">The first image is the storefront cover. Upload, replace, or remove up to 30 unique images.</Text>
      </div>
      {images.map((image, index) =>
      <div key={`${image}-${index}`} className="rounded-xl border border-line p-3">
          <Text size="xs" fw={700} mb="xs">{index === 0 ? 'Main image' : `Gallery image ${index + 1}`}</Text>
          <MediaUploader
          role="product"
          entityId={entityId}
          value={image}
          alt={`${productName || 'Product'} image ${index + 1}`}
          onChange={(url) => updateImage(index, url)} />
        
        </div>
      )}
      {images.length < 30 &&
      <div className="rounded-xl border border-dashed border-line p-3">
          <Text size="xs" fw={700} mb="xs">Add gallery image</Text>
          <MediaUploader role="product" entityId={entityId} alt={`${productName || 'Product'} new image`} onChange={addImage} />
        </div>
      }
      {!images.length && <Alert color="yellow">Add at least one image before publishing this product.</Alert>}
      <div className="rounded-xl border border-line p-3">
        <Text size="xs" fw={700} mb="xs">Optional product video</Text>
        <MediaUploader
          role="video"
          entityId={entityId}
          value={videoUrl}
          alt={`${productName || 'Product'} video`}
          onChange={(url) => onVideoChange(url || undefined)} />
        
        <Text size="xs" c="dimmed" mt="xs">The main product image is used as the video poster. MP4 and WebM up to 30 MB are stored on Cloudinary.</Text>
      </div>
    </Stack>);

}