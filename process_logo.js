const { Jimp } = require('jimp');

async function processImage() {
  try {
    const image = await Jimp.read('C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\2c87fd5d-7e03-42a9-8496-ba0692a09335\\odontounerg_illustration_1780254975951.png');
    
    // Remove white background
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // If pixel is white or very light gray, make it transparent
      if (r > 230 && g > 230 && b > 230) {
        this.bitmap.data[idx + 3] = 0; // Alpha
      }
    });

    // Crop transparent borders
    image.autocrop();
    
    image.write('./assets/logo-principal.png');
    console.log('Processed logo successfully');
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processImage();
