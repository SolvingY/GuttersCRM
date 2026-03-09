export interface CompressedImage {
  blob: Blob;
  previewUrl: string;
  sizeMB: string;
  name: string;
}

export async function compressImage(
  file: File,
  options = { maxWidthOrHeight: 1920, quality: 0.75 }
): Promise<CompressedImage> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const max = options.maxWidthOrHeight;
        if (width > height && width > max) {
          height = (height / width) * max;
          width = max;
        } else if (height >= width && height > max) {
          width = (width / height) * max;
          height = max;
        }
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            resolve({
              blob: blob!,
              previewUrl: canvas.toDataURL('image/jpeg', options.quality),
              sizeMB: (blob!.size / 1024 / 1024).toFixed(2),
              name: file.name,
            });
          },
          'image/jpeg',
          options.quality
        );
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}
