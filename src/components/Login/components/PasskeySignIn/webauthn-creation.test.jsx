import { describe, expect, it } from 'vitest';
import { attestationToJson, creationOptionsFromJson } from './index';

const bytes = (buffer) => Array.from(new Uint8Array(buffer));

describe('WebAuthn creation helpers', () => {
  const publicKey = { challenge: 'AQID', rp: { name: 'Mairie 360' }, user: { id: 'BAUG', name: 'a@b.test', displayName: 'A' }, excludeCredentials: [{ type: 'public-key', id: 'Bw' }] };

  it('turns the base64url binaries of the options into buffers, whole or bare', () => {
    for (const options of [{ publicKey }, publicKey]) {
      const result = creationOptionsFromJson(options);
      expect(bytes(result.challenge)).toEqual([1, 2, 3]);
      expect(bytes(result.user.id)).toEqual([4, 5, 6]);
      expect(bytes(result.excludeCredentials[0].id)).toEqual([7]);
      expect(result.user.name).toBe('a@b.test');
    }
  });

  it('accepts options without excluded credentials', () => {
    const rest = { ...publicKey };
    delete rest.excludeCredentials;
    expect('excludeCredentials' in creationOptionsFromJson(rest)).toBe(false);
  });

  it('serialises the new credential as base64url JSON, with its transports when the browser has them', () => {
    const credential = { id: 'c', rawId: new Uint8Array([251, 255]).buffer, type: 'public-key', authenticatorAttachment: 'platform', getClientExtensionResults: () => ({}), response: { attestationObject: new Uint8Array([2]).buffer, clientDataJSON: new Uint8Array([3]).buffer, getTransports: () => ['internal'] } };
    expect(attestationToJson(credential)).toEqual({ id: 'c', rawId: '-_8', type: 'public-key', authenticatorAttachment: 'platform', clientExtensionResults: {}, response: { attestationObject: 'Ag', clientDataJSON: 'Aw', transports: ['internal'] } });
    delete credential.response.getTransports;
    expect(attestationToJson(credential).response).toEqual({ attestationObject: 'Ag', clientDataJSON: 'Aw' });
  });
});
