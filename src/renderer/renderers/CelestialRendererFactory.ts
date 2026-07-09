import { BaseRenderer } from './BaseRenderer';
import { StarRenderer } from './StarRenderer';
import { PlanetRenderer } from './PlanetRenderer';
import { LivingWorldRenderer } from './LivingWorldRenderer';
import { CloudRenderer } from './CloudRenderer';
import { ConstellationRenderer } from './ConstellationRenderer';
import { DefaultRenderer } from './DefaultRenderer';
import { CelestialObjectType } from '../../types/astrolabe';

export class CelestialRendererFactory {
  private static renderers: Map<CelestialObjectType, BaseRenderer> = new Map();

  static {
    // Pre-instantiate renderers
    this.renderers.set('star', new StarRenderer());
    this.renderers.set('planet', new PlanetRenderer());
    this.renderers.set('living_world', new LivingWorldRenderer());
    this.renderers.set('cloud', new CloudRenderer());
    this.renderers.set('constellation', new ConstellationRenderer());
    
    const defaultRenderer = new DefaultRenderer();
    this.renderers.set('moon', defaultRenderer);
    this.renderers.set('asteroid', defaultRenderer);
    this.renderers.set('station', defaultRenderer);
    this.renderers.set('custom', defaultRenderer);
  }

  public static getRenderer(type: CelestialObjectType): BaseRenderer {
    return this.renderers.get(type) ?? this.renderers.get('custom')!;
  }
}
