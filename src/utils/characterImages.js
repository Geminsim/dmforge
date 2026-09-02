const IMAGE_DATA_URL = /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i;

export function characterAvatar(character = {}) {
  return character.avatarImage || character.sheet?.avatarImage || '';
}

export function characterPortrait(character = {}) {
  return character.portraitImage || character.sheet?.portraitImage || '';
}

export function safeCharacterImage(value, maxLength = 1_500_000) {
  return typeof value === 'string' && value.length <= maxLength && IMAGE_DATA_URL.test(value) ? value : '';
}

export function resizeCharacterImage(file, { maxDimension = 720, quality = 0.86 } = {}) {
  if (!file?.type?.startsWith('image/')) return Promise.reject(new Error('请选择 PNG、JPG 或 WebP 图片。'));
  if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error('原始图片不能超过 10MB。'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('图片读取失败。'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('无法识别这张图片。'));
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const transparent = file.type === 'image/png' || file.type === 'image/webp';
        resolve(canvas.toDataURL(transparent ? 'image/webp' : 'image/jpeg', quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
