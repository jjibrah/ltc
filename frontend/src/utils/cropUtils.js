export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

const degreesToRadians = (degrees) => (degrees * Math.PI) / 180;

const getRotatedSize = (width, height, rotation) => {
  const radians = degreesToRadians(rotation);
  return {
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  };
};

export default async function getCroppedImg(imageSrc, pixelCrop, options = {}) {
  const {
    rotation = 0,
    flipHorizontal = false,
    flipVertical = false,
    maxSize = 800,
    quality = 0.86,
  } = options;
  const image = await createImage(imageSrc);
  const radians = degreesToRadians(rotation);
  const rotatedSize = getRotatedSize(image.width, image.height, rotation);
  const sourceCanvas = document.createElement('canvas');
  const sourceContext = sourceCanvas.getContext('2d');

  if (!sourceContext) throw new Error('Image editing is not supported by this browser.');

  sourceCanvas.width = Math.ceil(rotatedSize.width);
  sourceCanvas.height = Math.ceil(rotatedSize.height);
  sourceContext.translate(sourceCanvas.width / 2, sourceCanvas.height / 2);
  sourceContext.rotate(radians);
  sourceContext.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
  sourceContext.translate(-image.width / 2, -image.height / 2);
  sourceContext.drawImage(image, 0, 0);

  const outputScale = Math.min(1, maxSize / Math.max(pixelCrop.width, pixelCrop.height));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image editing is not supported by this browser.');
  canvas.width = Math.max(1, Math.round(pixelCrop.width * outputScale));
  canvas.height = Math.max(1, Math.round(pixelCrop.height * outputScale));
  context.drawImage(
    sourceCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', quality);
  });
}
