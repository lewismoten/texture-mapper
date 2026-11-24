// Serial numbers for the 2010 Windows version of Texture Mapper.
//
// The program (AboutBox1.IsValid) accepts a serial when it equals characters 5-20 of the uppercase hex
// SHA-1 of the name followed by a fixed secret, hashed as UTF-8. The in-world registration object did the
// same with the owner's avatar name (llSHA1String, then llToUpper). The program is no longer sold, so the
// secret is public and anyone can make a serial here.

export const SECRET = "shakE wel.l bef?ore ope''ni#Ng 163mL";

/** SHA-1 of a string (UTF-8) as uppercase hex. Uses the browser's (or Node's) Web Crypto. */
async function sha1HexUpper(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * The serial number for a name, exactly as the program checks it. The name is used as given: the
 * program compares it case-sensitively and does not trim spaces, so type it the same way in both places.
 * Returns '' for an empty name (the program refuses an empty name).
 */
export async function serialFor(name) {
  if (!name) return '';
  const hex = await sha1HexUpper(name + SECRET);
  return hex.substring(4, 20);
}
