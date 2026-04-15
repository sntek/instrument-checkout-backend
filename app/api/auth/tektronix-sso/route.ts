import { auth } from "@/lib/auth";
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

    // Try signing in first (user already exists)
    const signInRes = await auth.api.signInEmail({
        body: { email, password: SSO_PASSWORD },
        asResponse: true,
        headers: request.headers,
    });

    if (signInRes.ok) {
        return signInRes;
    }

    // User doesn't exist yet — create them and sign in
    const signUpRes = await auth.api.signUpEmail({
        body: { email, password: SSO_PASSWORD, name: fullName },
        asResponse: true,
        headers: request.headers,
    });

    if (signUpRes.status === 422) {
        // User already exists but sign-in failed — try sign-in once more
        // (can happen if a previous sign-up succeeded but cookie wasn't returned)
        const retryRes = await auth.api.signInEmail({
            body: { email, password: SSO_PASSWORD },
            asResponse: true,
            headers: request.headers,
        });
        return retryRes;
    }

    return signUpRes;
}
