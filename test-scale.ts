import { ScaleManager } from './src/renderer/utils/ScaleManager';

const renderSize = ScaleManager.getNavChartVisualRadius('J', 56, 'AU', 10);
console.log('renderSize:', renderSize);
