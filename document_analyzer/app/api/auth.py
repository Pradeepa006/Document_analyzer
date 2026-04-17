"""
Auth routes: register and login.
Uses stdlib only (hashlib + secrets) — no extra dependencies required.
Users are persisted in users.json; tokens are kept in-memory for the session.
"""

import json
import os
import secrets
import hashlib
import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)

auth_router = APIRouter()

USERS_FILE = "users.json"

# In-memory token store: token -> email
_active_tokens: dict[str, str] = {}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _load_users() -> dict:
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    return {}


def _save_users(users: dict) -> None:
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 260_000
    ).hex()


def _verify_password(password: str, salt: str, stored_hash: str) -> bool:
    return secrets.compare_digest(_hash_password(password, salt), stored_hash)


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str
    full_name: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@auth_router.post("/register", status_code=201)
def register(body: RegisterRequest):
    email = body.email.strip().lower()
    if not email or not body.password:
        raise HTTPException(status_code=422, detail="Email and password are required.")

    users = _load_users()

    if email in users:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    salt = secrets.token_hex(16)
    users[email] = {
        "email": email,
        "full_name": body.full_name.strip(),
        "salt": salt,
        "password_hash": _hash_password(body.password, salt),
    }
    _save_users(users)
    logger.info("Registered new user: %s", email)
    return {"message": "Registration successful. You can now sign in."}


@auth_router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest):
    email = body.email.strip().lower()
    users = _load_users()

    user = users.get(email)
    if not user or not _verify_password(body.password, user["salt"], user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = secrets.token_urlsafe(32)
    _active_tokens[token] = email
    logger.info("User logged in: %s", email)
    return AuthResponse(
        access_token=token,
        email=email,
        full_name=user.get("full_name", ""),
    )


@auth_router.get("/users/me")
def get_me(request: Request):
    auth = request.headers.get("authorization", "")
    token = auth.removeprefix("Bearer ").strip()
    email = _active_tokens.get(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    users = _load_users()
    user = users.get(email, {})
    return {"email": email, "full_name": user.get("full_name", "")}
