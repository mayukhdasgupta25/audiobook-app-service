/**
 * Image Processing Service — spec-driven variant generation via ffmpeg
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { resolveFfmpegPath } from '../utils/ffmpegPath';

const execAsync = promisify(exec);

export class ImageProcessingService {
   async generateVariant(
      sourcePath: string,
      outputPath: string,
      width: number,
      height: number
   ): Promise<void> {
      if (!fs.existsSync(sourcePath)) {
         throw new Error(`Source image not found: ${sourcePath}`);
      }

      fs.mkdirSync(require('path').dirname(outputPath), { recursive: true });

      const ffmpegPath = resolveFfmpegPath();
      const resizeCommand = `"${ffmpegPath}" -i "${sourcePath}" -vf "scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}" "${outputPath}" -y`;

      await execAsync(resizeCommand, { timeout: 30000 });

      if (!fs.existsSync(outputPath)) {
         throw new Error(`Variant generation failed: ${outputPath} was not created`);
      }
   }
}
