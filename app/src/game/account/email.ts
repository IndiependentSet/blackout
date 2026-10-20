const EMAIL_RE = /\S+@\S+\.\S+/;

/** Does it look like an email address? (The server has the final say.) */
export const isEmail = (v: string) => EMAIL_RE.test((v || '').trim());
