import crypto from "crypto";

/**
 * Verification token result containing the raw token (sent only in email link)
 * and its SHA-256 hash and expiry timestamp (stored in DB).
 */
export interface GeneratedVerificationToken {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Token validity evaluation result.
 */
export type TokenValidationStatus =
  | "VALID"
  | "EXPIRED"
  | "ALREADY_USED"
  | "ALREADY_VERIFIED"
  | "INVALID";

/**
 * Generates a cryptographically secure 256-bit random verification token,
 * along with its SHA-256 hash and expiry date (default 24 hours).
 */
export function generateGuideVerificationToken(expiresInHours = 24): GeneratedVerificationToken {
  // 32 bytes = 256 bits of cryptographic entropy
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashVerificationToken(rawToken);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
}

/**
 * Computes the SHA-256 hash of a raw verification token.
 * Only the hash is ever stored in the database.
 */
export function hashVerificationToken(rawToken: string): string {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Invalid raw token provided for hashing");
  }
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

/**
 * Evaluates the status of a guide verification record based on tokens and flags.
 */
export function evaluateTokenStatus({
  recordFound,
  tokenUsedAt,
  tokenExpiresAt,
  isVerified,
}: {
  recordFound: boolean;
  tokenUsedAt?: Date | null;
  tokenExpiresAt?: Date | null;
  isVerified?: boolean;
}): TokenValidationStatus {
  if (!recordFound) {
    return "INVALID";
  }

  if (tokenUsedAt) {
    return isVerified ? "ALREADY_VERIFIED" : "ALREADY_USED";
  }

  if (isVerified) {
    return "ALREADY_VERIFIED";
  }

  if (tokenExpiresAt && new Date() > new Date(tokenExpiresAt)) {
    return "EXPIRED";
  }

  return "VALID";
}
