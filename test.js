const physicalSize = 56;
const unit = 'AU';
const zoomLevel = 10; // e.g. 10 pixels per AU

const AU_IN_MILES = 92955807;
let diameterAu = unit === 'AU' ? physicalSize : physicalSize / AU_IN_MILES;
const actualPixelRadius = (diameterAu / 2) * zoomLevel;

console.log("actualPixelRadius:", actualPixelRadius);
// actualPixelRadius is 280.
// If zoomLevel is 10, radius is 280 pixels.
// 280 / 10 = 28 AU.
// So the radius is EXACTLY 28 AU!
