import { auth, pool } from "@/lib/auth";
import { hashPassword } from "better-auth/crypto";
import { NextRequest, NextResponse } from "next/server";

// This password is never exposed to users — it's derived server-side only.
// Security is acceptable here since the app is only reachable within the company network.
const SSO_PASSWORD = process.env.TEK_SSO_SECRET ?? "tek-internal-sso-2024";

function parseName(email: string): { firstName: string; lastName: string; fullName: string } {
    const localPart = email.split("@")[0];
    const parts = localPart.split(".");
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const firstName = capitalize(parts[0] ?? "");
    const lastName = capitalize(parts[1] ?? "");
    return { firstName, lastName, fullName: `${firstName} ${lastName}`.trim() };
}

async function credentialAccountExists(email: string): Promise<boolean> {
    const res = await pool.query(
        `SELECT 1 FROM account
         JOIN "user" ON account."userId" = "user".id
         WHERE "user".email = $1
           AND account."providerId" = 'credential'
         LIMIT 1`,
        [email]
    );
    return res.rowCount !== null && res.rowCount > 0;
}

async function resetSsoPassword(email: string): Promise<void> {
    const hashed = await hashPassword(SSO_PASSWORD);
    await pool.query(
        `UPDATE account
         SET password = $1, "updatedAt" = NOW()
         FROM "user"
         WHERE account."userId" = "user".id
           AND "user".email = $2
           AND account."providerId" = 'credential'`,
        [hashed, email]
    );
}

export async function POST(request: NextRequest) {
    let email: string;
    try {
        const body = await request.json();
        email = (body.email ?? "").trim().toLowerCase();
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (!/^[a-z]+\.[a-z]+@tektronix\.com$/.test(email)) {
        return NextResponse.json(
            { error: "Enter your Tektronix email in the format first.last@tektronix.com" },
            { status: 400 }
        );
    }

    const { fullName } = parseName(email);

    // Fast path: try signing in directly (the common case for returning users).
    const signInRes = await auth.api.signInEmail({
        body: { email, password: SSO_PASSWORD },
        asResponse: true,
        headers: request.headers,
    });

    if (signInRes.ok) return signInRes;

    // Sign-in failed. better-auth returns 401 for both "wrong password" and "user not found",
    // so query the DB to tell them apart.
    const exists = await credentialAccountExists(email);

    if (exists) {
        // Account exists but password doesn't match — legacy account with a different password.
        // Reset it to the current SSO secret and sign in.
        await resetSsoPassword(email);
        const retryRes = await auth.api.signInEmail({
            body: { email, password: SSO_PASSWORD },
            asResponse: true,
            headers: request.headers,
        });
        return retryRes;
    }

    // New user — create their account. signUpEmail also signs them in.
    const signUpRes = await auth.api.signUpEmail({
        body: { email, password: SSO_PASSWORD, name: fullName },
        asResponse: true,
        headers: request.headers,
    });
    return signUpRes;
}
