/**
  * @param {string} url URL of image to check  
  * @returns {number} The score of the image
  */
export async function getImageScore(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth * img.naturalHeight);
    img.onerror = () => resolve(0); // fallback score if image fails to load
    img.src = url;
  });
}

export function logMarian(message, object = null) {
  if (!object) {
    console.log(`[👩🏻‍🏫 Marian] ${message}`);
  } else {
    console.group(`[👩🏻‍🏫 Marian] ${message}`);
    console.log(object);
    console.groupEnd();
  }
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
