/**
 * KarRooz Telegram Worker - Firestore REST Client
 *
 * Implements direct Cloud Firestore REST API calls (v1) using Google Service Account
 * credentials with Web Crypto RS256 JWT authentication.
 *
 * Designed specifically for the provisioned named database:
 * Database: ai-studio-karrooz-88dd94b4-bce7-4ddc-8723-1bca334db048
 * Project:  gen-lang-client-0985101866
 */

export interface ServiceAccountCredentials {
  project_id?: string;
  client_email: string;
  private_key: string;
}

function pemToPkcs8Der(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Creates a signed RS256 JWT using Web Crypto API
 */
export async function createSignedJwt(serviceAccount: ServiceAccountCredentials): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const claimB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claim)));
  const signingInput = `${headerB64}.${claimB64}`;

  const derKey = pemToPkcs8Der(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    derKey.buffer as ArrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Exchanges signed JWT for a Google OAuth2 access token with in-memory caching
 */
export async function getAccessToken(serviceAccount: ServiceAccountCredentials): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const jwt = await createSignedJwt(serviceAccount);
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Google OAuth2 authentication failed (${resp.status}): ${errText}`);
  }

  const json = (await resp.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in || 3600) * 1000,
  };
  return json.access_token;
}

/**
 * Serializes standard JavaScript types into Firestore REST values
 */
export function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Deserializes Firestore REST values into standard JavaScript types
 */
export function fromFirestoreValue(val: any): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      res[k] = fromFirestoreValue(v);
    }
    return res;
  }
  return null;
}

export function toFirestoreFields(data: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

export function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields || {})) {
    result[k] = fromFirestoreValue(v);
  }
  return result;
}

/**
 * High-level Cloud Firestore REST client conforming to the app's named database
 */
export class FirestoreRestClient {
  constructor(
    public readonly projectId: string,
    public readonly databaseId: string,
    private readonly serviceAccount: ServiceAccountCredentials
  ) {}

  public static fromJson(
    projectId: string,
    databaseId: string,
    serviceAccountJson: string
  ): FirestoreRestClient {
    const parsed = JSON.parse(serviceAccountJson) as ServiceAccountCredentials;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON: client_email and private_key are required.');
    }
    return new FirestoreRestClient(projectId, databaseId, parsed);
  }

  private async getAuthToken(): Promise<string> {
    return await getAccessToken(this.serviceAccount);
  }

  private getBaseUrl(): string {
    return `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents`;
  }

  /**
   * Retrieves a document by its relative path
   * e.g. "users/xyz/items/item_123"
   */
  public async getDocument(docPath: string): Promise<Record<string, any> | null> {
    const token = await this.getAuthToken();
    const url = `${this.getBaseUrl()}/${docPath}`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (resp.status === 404) {
      return null;
    }

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Firestore GET ${docPath} failed (${resp.status}): ${errText}`);
    }

    const doc = (await resp.json()) as { name: string; fields?: Record<string, any> };
    return doc.fields ? fromFirestoreFields(doc.fields) : {};
  }

  /**
   * Creates or overwrites/merges a document at the specified path
   */
  public async setDocument(
    docPath: string,
    data: Record<string, any>,
    merge = true
  ): Promise<void> {
    const token = await this.getAuthToken();
    let url = `${this.getBaseUrl()}/${docPath}`;

    // Apply updateMask if merging to preserve existing untouched fields
    if (merge) {
      const params = new URLSearchParams();
      for (const key of Object.keys(data)) {
        if (data[key] !== undefined) {
          params.append('updateMask.fieldPaths', key);
        }
      }
      url += `?${params.toString()}`;
    }

    const resp = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: toFirestoreFields(data),
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Firestore PATCH ${docPath} failed (${resp.status}): ${errText}`);
    }
  }

  /**
   * Deletes a document by path
   */
  public async deleteDocument(docPath: string): Promise<void> {
    const token = await this.getAuthToken();
    const url = `${this.getBaseUrl()}/${docPath}`;

    const resp = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resp.ok && resp.status !== 404) {
      const errText = await resp.text();
      throw new Error(`Firestore DELETE ${docPath} failed (${resp.status}): ${errText}`);
    }
  }

  /**
   * Lists all documents in a collection
   * e.g. "users/xyz/items"
   */
  /**
   * Lists all documents in a collection, traversing all page tokens to prevent silent dataset truncation
   * e.g. "users/xyz/items"
   */
  public async listDocuments(collectionPath: string): Promise<Array<{ id: string; data: Record<string, any> }>> {
    const token = await this.getAuthToken();
    const allDocs: Array<{ id: string; data: Record<string, any> }> = [];
    let pageToken: string | undefined = undefined;

    do {
      let url = `${this.getBaseUrl()}/${collectionPath}?pageSize=300`;
      if (pageToken) {
        url += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (resp.status === 404) {
        return [];
      }

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Firestore LIST ${collectionPath} failed (${resp.status}): ${errText}`);
      }

      const result = (await resp.json()) as {
        documents?: Array<{ name: string; fields?: Record<string, any> }>;
        nextPageToken?: string;
      };

      if (result.documents && result.documents.length > 0) {
        for (const d of result.documents) {
          const parts = d.name.split('/');
          const id = parts[parts.length - 1];
          allDocs.push({
            id,
            data: d.fields ? fromFirestoreFields(d.fields) : {},
          });
        }
      }

      pageToken = result.nextPageToken;
    } while (pageToken);

    return allDocs;
  }

  /**
   * Commits atomic batch writes (mutations) to Firestore in a single transaction
   */
  public async commit(writes: Array<Record<string, any>>): Promise<void> {
    const token = await this.getAuthToken();
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:commit`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ writes }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Firestore commit failed (${resp.status}): ${errText}`);
    }
  }

  /**
   * Verifies database access and connection
   */
  public async verifyConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.getAuthToken();
      // Test read on root documents metadata
      const resp = await fetch(`${this.getBaseUrl()}?pageSize=1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await this.getAuthToken()}`,
        },
      });
      if (resp.ok || resp.status === 404) {
        return { ok: true };
      }
      return { ok: false, error: `Status ${resp.status}: ${await resp.text()}` };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  }
}
