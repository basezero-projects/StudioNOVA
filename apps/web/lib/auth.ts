/**
 * Authentication helpers for StudioNOVA v0.01.
 *
 * Depends on `bcryptjs` for password hashing. Cookies are signed using an HMAC
 * derived from AUTH_SECRET (or a clearly-marked development fallback).
 */

import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_DISABLED } from "@/lib/config";

const SESSION_COOKIE_NAME = "studio_nova_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const encoder = new TextEncoder();

export const DEV_USER = {
  id: "dev-user-id",
  email: "dev@studionova.local",
};

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (secret && secret.trim().length > 0) {
    return secret;
  }

  // Development-only fallback; replace in production.
  return "studio-nova-dev-secret-change-me";
}

function encodePayload(payload: object): string {
  const json = JSON.stringify(payload);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(json).toString("base64url");
  }

  const bytes = encoder.encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function decodePayload(value: string): Record<string, unknown> | null {
  try {
    if (typeof Buffer !== "undefined") {
      const decoded = Buffer.from(value, "base64url").toString("utf8");
      return JSON.parse(decoded) as Record<string, unknown>;
    }

    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bufferToHex(signature);
}

async function createSessionToken(userId: string): Promise<string> {
  const payload = encodePayload({ userId, iat: Date.now() });
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

async function parseSessionToken(token: string): Promise<string | null> {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expected = await sign(payload);
  if (signature !== expected) {
    return null;
  }

  const data = decodePayload(payload);
  const userId = data?.userId;

  return typeof userId === "string" ? userId : null;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function setSessionCookie(userId: string): Promise<NextResponse> {
  const token = await createSessionToken(userId);
  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}

export function clearSessionCookie(): NextResponse {
  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  if (AUTH_DISABLED) {
    // Local dev mode: bypass cookie validation entirely.
    return DEV_USER.id;
  }

  const cookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!cookie?.value) {
    return null;
  }

  return parseSessionToken(cookie.value);
}

export async function applySessionCookie(
  response: NextResponse,
  userId: string
): Promise<NextResponse> {
  const token = await createSessionToken(userId);

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}

export function removeSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

