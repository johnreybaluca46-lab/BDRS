import Swal from 'sweetalert2';

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export const compressImageToBase64 = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    // 5MB Limit Check
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        title: 'File Too Large',
        text: 'Please upload an image smaller than 5MB.',
        icon: 'error',
        showConfirmButton: false,
        timer: 3000
      });
      return reject(new Error("File exceeds 5MB limit"));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height *= maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width *= maxHeight / height));
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Use JPEG to ensure smaller file size (Base64)
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
