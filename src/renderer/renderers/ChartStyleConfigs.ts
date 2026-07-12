import { NavigationChartStyleConfig } from '../../types/renderer';

import fireSvgUrl from '../../../assets/elements/fire.svg';
import waterSvgUrl from '../../../assets/elements/water.svg';
import earthSvgUrl from '../../../assets/elements/earth.svg';
import airSvgUrl from '../../../assets/elements/air.svg';
import mixedSvgUrl from '../../../assets/elements/mixed.svg';
import noneSvgUrl from '../../../assets/elements/none.svg';

import starObjSvgUrl from '../../../assets/objects/star.svg';
import planetObjSvgUrl from '../../../assets/objects/planet.svg';
import moonObjSvgUrl from '../../../assets/objects/moon.svg';
import asteroidObjSvgUrl from '../../../assets/objects/asteroid.svg';
import stationObjSvgUrl from '../../../assets/objects/station.svg';
import cloudObjSvgUrl from '../../../assets/objects/cloud.svg';
import livingWorldObjSvgUrl from '../../../assets/objects/living_world.svg';
import customObjSvgUrl from '../../../assets/objects/custom.svg';

const defaultAssets = {
  elements: {
    fire: fireSvgUrl,
    water: waterSvgUrl,
    earth: earthSvgUrl,
    air: airSvgUrl,
    mixed: mixedSvgUrl,
    none: noneSvgUrl
  },
  objects: {
    star: starObjSvgUrl,
    planet: planetObjSvgUrl,
    moon: moonObjSvgUrl,
    asteroid: asteroidObjSvgUrl,
    station: stationObjSvgUrl,
    cloud: cloudObjSvgUrl,
    living_world: livingWorldObjSvgUrl,
    custom: customObjSvgUrl
  }
};

export const vellumStyleConfig: NavigationChartStyleConfig = {
  isDarkTheme: false,
  backgroundColor: '#f9f5e8',
  gridColor: 'rgba(94, 79, 60, 0.05)',
  strokeColor: '#2b2316',
  mutedColor: '#7c694e',
  goldColor: '#b58315',
  
  backgroundImageUrl: '/images/vellum_bg.png',
  foregroundImageUrl: '/images/wood_desk.png',
  
  titleFontFamily: "'Elan', 'Cinzel', serif",
  starFontFamily: "'Elan', 'Cinzel', serif",
  defaultFontFamily: "'Elan', 'Outfit', sans-serif",
  
  titleStrikeColor: '#e0caa6',
  titleStrikeThicknessMultiplier: 0.15,
  
  primaryOrbitAlpha: 0.18,
  secondaryOrbitAlpha: 0.25,
  primaryOrbitRgb: '94, 79, 60',
  secondaryOrbitRgb: '143, 50, 36',
  
  shellStrokeColor: '#382013',
  shellInnerStrokeColor: '#5c3a21',
  shellShadowColor: 'rgba(43, 20, 10, 0.8)',
  
  hasDecorations: true,
  
  directoryDividerColor: '#c8b185',
  directoryTitleColor: '#2b2316',
  directorySubTitleColor: '#5e4f3c',
  directoryIconColor: null,
  directoryTextColor: '#2b2316',
  
  noteTextColor: '#2b2316',
  noteSelectionColor: '#2b2316',
  
  legendBorderColor: '#2b2316',
  legendTextColor: '#2b2316',
  legendTitleColor: '#2b2316',
  
  assets: {
    ...defaultAssets,
    decorations: {
      ink: '/images/stain_ink.png',
      coffee: '/images/stain_coffee.png',
      burn: '/images/stain_burn.png'
    }
  }
};

export const spaceStyleConfig: NavigationChartStyleConfig = {
  isDarkTheme: true,
  backgroundColor: '#06070a',
  gridColor: 'rgba(255, 255, 255, 0.03)',
  strokeColor: '#ffffff',
  mutedColor: '#888d9e',
  goldColor: '#e2b34a',
  
  backgroundImageUrl: undefined,
  foregroundImageUrl: '/images/wood_desk.png',
  
  titleFontFamily: "'Elan', 'Cinzel', serif",
  starFontFamily: "'Elan', 'Cinzel', serif",
  defaultFontFamily: "'Elan', 'Outfit', sans-serif",
  
  titleStrikeColor: '#06070a',
  titleStrikeThicknessMultiplier: 0.15,
  
  primaryOrbitAlpha: 0.15,
  secondaryOrbitAlpha: 0.3,
  primaryOrbitRgb: '255, 255, 255',
  secondaryOrbitRgb: '68, 128, 230',
  
  shellStrokeColor: '#ffffff',
  shellInnerStrokeColor: '#ffffff',
  shellShadowColor: undefined,
  
  hasDecorations: false,
  
  directoryDividerColor: 'rgba(255, 255, 255, 0.3)',
  directoryTitleColor: '#ffffff',
  directorySubTitleColor: 'rgba(255, 255, 255, 0.7)',
  directoryIconColor: '#ffffff',
  directoryTextColor: '#ffffff',
  
  noteTextColor: '#ffffff',
  noteSelectionColor: '#ffffff',
  
  legendBorderColor: '#ffffff',
  legendTextColor: '#ffffff',
  legendTitleColor: '#ffffff',
  
  assets: defaultAssets
};
