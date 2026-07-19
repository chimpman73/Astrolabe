import { getNoteCorners } from '../../utils/noteInteractions';
import { MapStyleContext, NavigationChartStyleConfig } from '../../../types/renderer';

export class NoteRenderer {
  public static draw(
    context: MapStyleContext,
    visibleObjects: any[],
    config: NavigationChartStyleConfig
  ): void {
    const { ctx, activeZoom, baseZoom, project, selectedObjectId, objects } = context;
    const notes = visibleObjects.filter(o => o.type === 'note');
    console.log(`NoteRenderer.draw: total notes = ${notes.length}`, notes);
    if (notes.length === 0) return;

    ctx.save();
    notes.forEach(note => {
      const dist = note.noteDistanceAU || 0;
      const angle = note.noteAngle || 0;
      const rot = note.noteRotation || 0;
      const fontSize = note.noteFontSize || 16;
      const fontFamily = note.noteFontFamily || 'Elan';
      console.log(`NoteRenderer: note "${note.name}" (id: ${note.id}) description: "${note.description}" dist: ${dist} angle: ${angle}`);
      
      const rad = (angle * Math.PI) / 180;
      const x = Math.cos(rad) * dist;
      const y = Math.sin(rad) * dist;
      
      const proj = project(x, y);

      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.rotate((rot * Math.PI) / 180);
      
      const normalizedZoom = activeZoom / (baseZoom || 1);
      ctx.scale(normalizedZoom, normalizedZoom);

      ctx.font = `${fontSize}px '${fontFamily}', sans-serif`;
      ctx.fillStyle = config.strokeColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const corners = getNoteCorners(note);
      const tl = corners.tl;
      const tr = corners.tr;
      const bl = corners.bl;
      const br = corners.br;
      
      const lineHeight = fontSize * 1.2;
      const paragraphs = (note.description || '').split('\n');
      
      const lines: { text: string; x: number; y: number }[] = [];
      
      const minY = Math.min(tl.y, tr.y);
      const maxY = Math.max(bl.y, br.y);
      let currentY = minY + lineHeight / 2;
      
      const getBoundsAtY = (yAtLine: number) => {
         const leftX = tl.y === bl.y ? Math.min(tl.x, bl.x) : tl.x + (yAtLine - tl.y) * (bl.x - tl.x) / (bl.y - tl.y);
         const rightX = tr.y === br.y ? Math.min(tr.x, br.x) : tr.x + (yAtLine - tr.y) * (br.x - tr.x) / (br.y - tr.y);
         return { leftX, rightX };
      };

      paragraphs.forEach((paragraph: any) => {
        const words = (paragraph as string).split(' ');
        let currentLine = '';
        
        words.forEach(word => {
          if (currentY > maxY) return;
          
          const testLine = currentLine === '' ? word : currentLine + ' ' + word;
          const metrics = ctx.measureText(testLine);
          
          const { leftX, rightX } = getBoundsAtY(currentY);
          const availableWidth = rightX - leftX;
          
          if (metrics.width > availableWidth && currentLine !== '') {
            const prevBounds = getBoundsAtY(currentY);
            lines.push({ text: currentLine, x: (prevBounds.leftX + prevBounds.rightX) / 2, y: currentY });
            currentLine = word;
            currentY += lineHeight;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine !== '' && currentY <= maxY) {
          const { leftX, rightX } = getBoundsAtY(currentY);
          lines.push({ text: currentLine, x: (leftX + rightX) / 2, y: currentY });
          currentY += lineHeight;
        }
      });
      console.log(`NoteRenderer: note "${note.name}" lines calculated =`, lines);

      const isSelected = selectedObjectId !== null && objects.find((o: any) => o.id === selectedObjectId)?.name === note.name;
      console.log(`NoteRenderer: note "${note.name}" isSelected = ${isSelected} (selectedObjectId: ${selectedObjectId})`);
      
      const drawPolyPath = () => {
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
      };

      if (isSelected) {
        ctx.save();
        drawPolyPath();
        ctx.setLineDash([5 / normalizedZoom, 5 / normalizedZoom]);
        ctx.strokeStyle = config.strokeColor;
        ctx.lineWidth = 1 / normalizedZoom;
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      drawPolyPath();
      ctx.clip();

      lines.forEach((line) => {
        console.log(`NoteRenderer: fillText "${line.text}" at x: ${line.x}, y: ${line.y}`);
        ctx.fillText(line.text, line.x, line.y);
      });
      ctx.restore();

      if (isSelected) {
         ctx.fillStyle = config.strokeColor;
         const r = 6 / normalizedZoom;
         ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
         ctx.beginPath(); ctx.arc(tl.x, tl.y, r, 0, Math.PI * 2); ctx.fill();
         ctx.beginPath(); ctx.arc(tr.x, tr.y, r, 0, Math.PI * 2); ctx.fill();
         ctx.beginPath(); ctx.arc(bl.x, bl.y, r, 0, Math.PI * 2); ctx.fill();
         ctx.beginPath(); ctx.arc(br.x, br.y, r, 0, Math.PI * 2); ctx.fill();
         
         ctx.beginPath(); ctx.arc(tr.x + 20, tr.y - 20, r, 0, Math.PI * 2); ctx.fill();
         
         ctx.save();
         ctx.beginPath();
         ctx.moveTo(tr.x, tr.y);
         ctx.lineTo(tr.x + 20, tr.y - 20);
         ctx.strokeStyle = config.strokeColor;
         ctx.lineWidth = 1 / normalizedZoom;
         ctx.setLineDash([2 / normalizedZoom, 2 / normalizedZoom]);
         ctx.stroke();
         ctx.restore();
      }

      ctx.restore();
    });
    ctx.restore();
  }
}
