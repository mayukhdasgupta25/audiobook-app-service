import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

function getWindowsCandidatePaths(exeName: string): string[] {
   const localAppData = process.env['LOCALAPPDATA'];
   const programFiles = process.env['ProgramFiles'];

   return [
      localAppData ? path.join(localAppData, 'Microsoft', 'WinGet', 'Links', exeName) : '',
      path.join('C:', 'ffmpeg', 'bin', exeName),
      programFiles ? path.join(programFiles, 'ffmpeg', 'bin', exeName) : '',
      localAppData ? path.join(localAppData, 'Programs', 'ffmpeg', 'bin', exeName) : '',
   ].filter((candidate): candidate is string => Boolean(candidate));
}

/**
 * Resolve ffmpeg when configured as a bare command name but not on PATH.
 */
export function resolveFfmpegPath(): string {
   const configuredPath = config.FFMPEG_PATH;

   if (path.isAbsolute(configuredPath) && fs.existsSync(configuredPath)) {
      return configuredPath;
   }

   if (process.platform === 'win32') {
      for (const candidate of getWindowsCandidatePaths('ffmpeg.exe')) {
         if (fs.existsSync(candidate)) {
            return candidate;
         }
      }
   }

   return configuredPath;
}
