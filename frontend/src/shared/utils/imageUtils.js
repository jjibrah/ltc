/**
 * Utility for generating Cloudinary Image URLs
 * Assumes you have a VITE_CLOUDINARY_CLOUD_NAME in your .env file
 */
export function getCloudinaryUrl(publicId, width = 800) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo'; // Fallback to 'demo' for preview
  
  // Example of transformations: format to auto (WebP usually), quality to auto, scale to width
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${width},c_scale/${publicId}`;
}
