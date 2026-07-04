import { BaseRenderer, RenderContext } from './BaseRenderer';

export class DefaultRenderer extends BaseRenderer {
  public draw(context: RenderContext): void {
    this.drawBaseSolid(context);
  }
}
