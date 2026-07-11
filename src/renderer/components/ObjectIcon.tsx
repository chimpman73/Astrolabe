import React from 'react';
import { Sparkles, Folder, StickyNote, HelpCircle } from 'lucide-react';

import starSvgUrl from '../../../assets/objects/star.svg';
import moonSvgUrl from '../../../assets/objects/moon.svg';
import cloudSvgUrl from '../../../assets/objects/cloud.svg';
import livingWorldSvgUrl from '../../../assets/objects/living_world.svg';
import stationSvgUrl from '../../../assets/objects/station.svg';
import asteroidSvgUrl from '../../../assets/objects/asteroid.svg';
import planetSvgUrl from '../../../assets/objects/planet.svg';
import customSvgUrl from '../../../assets/objects/custom.svg';

const svgUrls: Record<string, string> = {
  star: starSvgUrl,
  moon: moonSvgUrl,
  cloud: cloudSvgUrl,
  living_world: livingWorldSvgUrl,
  station: stationSvgUrl,
  asteroid: asteroidSvgUrl,
  planet: planetSvgUrl,
  custom: customSvgUrl
};

interface ObjectIconProps {
  type: string;
  className?: string;
  size?: number;
}

export const ObjectIcon: React.FC<ObjectIconProps> = ({ type, className = "", size = 32 }) => {
  if (svgUrls[type]) {
    let colorClass = 'text-gray-500';
    switch (type) {
      case 'star': colorClass = 'text-yellow-600 dark:text-yellow-400'; break;
      case 'moon': colorClass = 'text-gray-500 dark:text-gray-400'; break;
      case 'cloud': colorClass = 'text-blue-400'; break;
      case 'living_world': colorClass = 'text-green-600 dark:text-green-500'; break;
      case 'station': colorClass = 'text-slate-400 dark:text-slate-300'; break;
      case 'asteroid': colorClass = 'text-orange-400 dark:text-orange-300'; break;
      case 'planet': colorClass = 'text-blue-600 dark:text-blue-400'; break;
      case 'custom': colorClass = 'text-pink-500'; break;
    }

    return (
      <div 
        className={`${className} ${colorClass}`} 
        style={{
          backgroundColor: 'currentColor',
          WebkitMaskImage: `url(${svgUrls[type]})`,
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          display: 'inline-block',
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          flexShrink: 0
        }}
      />
    );
  }

  const iconClass = `${className} w-[${size}px] h-[${size}px] flex-shrink-0`;

  switch (type) {
    case 'constellation': return <Sparkles className={`${iconClass} text-purple-400`} style={{ width: size, height: size }} />;
    case 'group': return <Folder className={`${iconClass} text-[#8b7355]`} style={{ width: size, height: size }} />;
    case 'note': return <StickyNote className={`${iconClass} text-[#e2b34a]`} style={{ width: size, height: size }} />;
    default: return <HelpCircle className={`${iconClass} text-gray-500`} style={{ width: size, height: size }} />;
  }
};
