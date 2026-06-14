import { AudioBookOwnerInput, AudioBookOwnerType } from '../models/AudioBookDto';

const VALID_OWNER_TYPES: AudioBookOwnerType[] = ['AUTHOR', 'ORGANIZATION'];

export function isValidOwnerType(value: unknown): value is AudioBookOwnerType {
  return typeof value === 'string' && VALID_OWNER_TYPES.includes(value as AudioBookOwnerType);
}

/**
 * Parse owner from JSON body or form-data (owner may be a JSON string).
 */
export function parseAudioBookOwnerFromBody(body: Record<string, unknown>): AudioBookOwnerInput | null {
  let raw = body['owner'];

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as { type?: unknown; id?: unknown };
  if (!isValidOwnerType(candidate.type)) {
    return null;
  }

  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
    return null;
  }

  return {
    type: candidate.type,
    id: candidate.id.trim(),
  };
}
