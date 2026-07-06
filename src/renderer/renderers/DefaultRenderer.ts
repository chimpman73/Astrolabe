import { BaseRenderer } from './BaseRenderer';
import { RenderContext } from '../../types/renderer';

export class DefaultRenderer extends BaseRenderer {
  public draw(context: RenderContext): void {
    this.drawBaseSolid(context);
  }
}
