/** Browser side of the WebAuthn ceremony: BFF User speaks JSON (base64url binaries), `navigator.credentials` speaks buffers. */

export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function" && !!navigator.credentials;
}

export async function isConditionalMediationAvailable(): Promise<boolean> {
  try {
    return (await window.PublicKeyCredential?.isConditionalMediationAvailable?.()) === true;
  } catch {
    return false;
  }
}

export function base64UrlToBuffer(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export function bufferToBase64Url(buffer: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type JsonObject = Record<string, unknown>;
type CredentialDescriptorJson = JsonObject & { id?: unknown };

/** The `options` of BFF User are either the whole `CredentialRequestOptions` (`{ publicKey }`) or the bare `publicKey`. */
export function requestOptionsFromJson(options: JsonObject): PublicKeyCredentialRequestOptions {
  const source = (typeof options.publicKey === "object" && options.publicKey !== null ? options.publicKey : options) as JsonObject;
  const allowCredentials = Array.isArray(source.allowCredentials)
    ? (source.allowCredentials as CredentialDescriptorJson[]).map((descriptor) => ({
        ...descriptor,
        id: base64UrlToBuffer(String(descriptor.id)),
      }))
    : undefined;
  return {
    ...source,
    challenge: base64UrlToBuffer(String(source.challenge)),
    ...(allowCredentials ? { allowCredentials } : {}),
  } as PublicKeyCredentialRequestOptions;
}

/** The `PublicKeyCredential` as its WebAuthn JSON form, which BFF User forwards to Core as is. */
export function credentialToJson(credential: PublicKeyCredential): JsonObject {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    ...(credential.authenticatorAttachment ? { authenticatorAttachment: credential.authenticatorAttachment } : {}),
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      signature: bufferToBase64Url(response.signature),
      ...(response.userHandle ? { userHandle: bufferToBase64Url(response.userHandle) } : {}),
    },
  };
}

/** The browser window was closed or the ceremony was replaced: nothing to tell the agent. */
export function isCancellation(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "AbortError");
}
