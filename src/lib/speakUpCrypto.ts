// End-to-end encryption for Speak Up. Runs in the reporter's and handlers' browsers (and in Node for tests);
// the server only ever stores and relays the results.
//
//  - Each report has its own AES-256-GCM "case key", made in the reporter's browser. The report, contact
//    details, messages, file names and files are all encrypted with it.
//  - The case key is wrapped (RSA-OAEP) for each handler who may open the case, and under a key derived from
//    the reporter's access code so the reporter can return. Wrapped copies are the only way to the key.
//  - A handler's private key is made in their browser and stored only after being encrypted with a key derived
//    from their passphrase.
//  - The access code gives two things at once: a key that unwraps the case key (never sent), and a separate
//    authenticator the server can check against a stored hash.

const subtle = (): SubtleCrypto => {
  const api = globalThis.crypto?.subtle;
  if (!api) throw new Error("This browser cannot do the encryption needed. Try a current browser.");
  return api;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let index = 0; index < view.length; index += 0x8000) binary += String.fromCharCode(...view.subarray(index, index + 0x8000));
  return btoa(binary);
}

export function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

// ---- case key and content ------------------------------------------------------------------

export async function generateCaseKey() {
  return subtle().generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function encryptBytes(key: CryptoKey, data: Uint8Array) {
  const iv = randomBytes(12);
  const cipher = await subtle().encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, data as BufferSource);
  return { cipher: new Uint8Array(cipher), iv: toBase64(iv) };
}

export async function decryptBytes(key: CryptoKey, cipher: Uint8Array, ivBase64: string) {
  const plain = await subtle().decrypt({ name: "AES-GCM", iv: fromBase64(ivBase64) as BufferSource }, key, cipher as BufferSource);
  return new Uint8Array(plain);
}

export async function encryptText(key: CryptoKey, text: string) {
  const result = await encryptBytes(key, encoder.encode(text));
  return { cipher: toBase64(result.cipher), iv: result.iv };
}

export async function decryptText(key: CryptoKey, cipherBase64: string, ivBase64: string) {
  return decoder.decode(await decryptBytes(key, fromBase64(cipherBase64), ivBase64));
}

// ---- handlers ------------------------------------------------------------------------------

export type PublicKeyJwk = JsonWebKey;
export type ProtectedPrivateKey = { cipher: string; iv: string; salt: string; iterations: number };

export async function generateHandlerKeyPair() {
  const pair = await subtle().generateKey(
    { name: "RSA-OAEP", modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["wrapKey", "unwrapKey", "encrypt", "decrypt"],
  );
  const publicKey = await subtle().exportKey("jwk", pair.publicKey);
  return { publicKey, privateKey: pair.privateKey };
}

export async function wrapCaseKeyForHandler(caseKey: CryptoKey, publicKey: PublicKeyJwk) {
  const key = await subtle().importKey("jwk", publicKey, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["wrapKey"]);
  const wrapped = await subtle().wrapKey("raw", caseKey, key, { name: "RSA-OAEP" });
  return toBase64(wrapped);
}

export async function unwrapCaseKey(privateKey: CryptoKey, wrappedBase64: string) {
  return subtle().unwrapKey("raw", fromBase64(wrappedBase64) as BufferSource, privateKey, { name: "RSA-OAEP" }, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

const HANDLER_KDF_ITERATIONS = 600_000;

async function passphraseKey(passphrase: string, salt: Uint8Array, iterations: number) {
  const base = await subtle().importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

// A handler's passphrase is the only thing protecting their private key if the database were ever copied, so it has to
// be hard to guess offline: long, made of unrelated words, and free of obvious patterns.
const COMMON_PASSPHRASE_PARTS = ["password", "passw0rd", "qwerty", "letmein", "welcome", "enshore", "speakup", "whistle", "123456", "abcdef", "iloveyou", "administrator", "changeme"];

export function passphraseProblem(passphrase: string) {
  const text = passphrase.trim();
  if (text.length < 16) return "Use at least 16 characters. Four or more unrelated words works well.";
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 4 && text.length < 24) return "Use four or more unrelated words, or a longer phrase of at least 24 characters.";
  const flat = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (COMMON_PASSPHRASE_PARTS.some((part) => flat.includes(part))) return "That includes a very common word or pattern. Choose unrelated words that only mean something to you.";
  if (new Set(text.toLowerCase()).size < 8) return "That passphrase is too repetitive.";
  return "";
}

export async function protectPrivateKey(privateKey: CryptoKey, passphrase: string): Promise<ProtectedPrivateKey> {
  const salt = randomBytes(16);
  const wrapKey = await passphraseKey(passphrase, salt, HANDLER_KDF_ITERATIONS);
  const pkcs8 = new Uint8Array(await subtle().exportKey("pkcs8", privateKey));
  const { cipher, iv } = await encryptBytes(wrapKey, pkcs8);
  return { cipher: toBase64(cipher), iv, salt: toBase64(salt), iterations: HANDLER_KDF_ITERATIONS };
}

export async function unlockPrivateKey(protectedKey: ProtectedPrivateKey, passphrase: string) {
  const wrapKey = await passphraseKey(passphrase, fromBase64(protectedKey.salt), protectedKey.iterations);
  let pkcs8: Uint8Array;
  try {
    pkcs8 = await decryptBytes(wrapKey, fromBase64(protectedKey.cipher), protectedKey.iv);
  } catch {
    throw new Error("That passphrase is not right.");
  }
  return subtle().importKey("pkcs8", pkcs8 as BufferSource, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["unwrapKey", "decrypt"]);
}

// ---- the reporter's access code ------------------------------------------------------------

// 31 characters with nothing easily confused (no 0, 1, I, L or O): about 5 bits each, 20 characters ~ 99 bits.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ACCESS_CODE_ITERATIONS = 250_000;

export function generateAccessCode() {
  const characters: string[] = [];
  // rejection sampling so every character is equally likely
  while (characters.length < 20) {
    for (const byte of randomBytes(32)) {
      if (byte < 248 && characters.length < 20) characters.push(CODE_ALPHABET[byte % CODE_ALPHABET.length]);
    }
  }
  return [0, 5, 10, 15].map((start) => characters.slice(start, start + 5).join("")).join("-");
}

export function normaliseAccessCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function deriveFromAccessCode(code: string, saltBase64: string, iterations: number) {
  const base = await subtle().importKey("raw", encoder.encode(normaliseAccessCode(code)), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await subtle().deriveBits({ name: "PBKDF2", salt: fromBase64(saltBase64) as BufferSource, iterations, hash: "SHA-256" }, base, 512));
  // first half unwraps the case key and never leaves the device; the second half proves the person holds the code
  const wrapKey = await subtle().importKey("raw", bits.slice(0, 32), { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  return { wrapKey, authToken: toBase64(bits.slice(32)) };
}

export function newReporterSalt() {
  return toBase64(randomBytes(16));
}

export async function wrapCaseKeyForReporter(caseKey: CryptoKey, wrapKey: CryptoKey) {
  const raw = new Uint8Array(await subtle().exportKey("raw", caseKey));
  const { cipher, iv } = await encryptBytes(wrapKey, raw);
  return { wrapped: toBase64(cipher), iv };
}

export async function unwrapCaseKeyForReporter(wrapKey: CryptoKey, wrappedBase64: string, ivBase64: string) {
  let raw: Uint8Array;
  try {
    raw = await decryptBytes(wrapKey, fromBase64(wrappedBase64), ivBase64);
  } catch {
    throw new Error("That access code is not right.");
  }
  return subtle().importKey("raw", raw as BufferSource, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

// ---- key fingerprints ------------------------------------------------------------------------

// A short, readable fingerprint of a handler's public key. Handlers can check that the one the IMS shows for them
// matches the one they see on their own screen, which would reveal a key swapped by someone else.
export async function keyFingerprint(publicKey: PublicKeyJwk) {
  const digest = new Uint8Array(await subtle().digest("SHA-256", encoder.encode(String(publicKey.n || ""))));
  const hex = Array.from(digest.slice(0, 10), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  return (hex.match(/.{1,4}/g) || []).join("-");
}
