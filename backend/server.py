from dotenv import load_dotenv
load_dotenv()

import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, List, Optional
import ipaddress
import re
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import bcrypt
import httpx
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests as http_requests
from bson import ObjectId
from fastapi import (APIRouter, Depends, FastAPI, File, Header, HTTPException,
                     Query, Request, Response, UploadFile)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response as RawResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field
from pymongo import ReturnDocument

try:
    import razorpay
except ImportError:
    razorpay = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("physical-editions")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    tls=True,
    tlsAllowInvalidCertificates=True,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=30000,
)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
PROMO_CODE = "tO+B3Pma):H3*6PSDtsA1Q@Q$b_XFUSy%syzm3Gmh5}iPz&[xR2<FPUDI@(dPW;"
BASE_POSTER_PRICES = {
    "A4": {"framed": 259, "unframed": 149},
    "A3": {"framed": 399, "unframed": 179},
    "A5": {"unframed": 89},
}
POSTER_DISCOUNT_PERCENT = 0
POSTER_LIST_PRICES = BASE_POSTER_PRICES
POSTER_PRICES = BASE_POSTER_PRICES
COVER_PRICE = 199
PLATFORMS = ["PlayStation 5", "PlayStation 4", "Xbox", "PC"]


def offer_freebie_allocations(items: list[dict]) -> dict[int, int]:
    groups = [
        (5, lambda item: item["size"] == "A4" and item["framing"] == "unframed"),
        (6, lambda item: item["size"] == "A3" and item["framing"] == "unframed"),
        (6, lambda item: item["size"] in ("A3", "A4") and item["framing"] == "framed"),
    ]
    allocations = {}
    for threshold, matches in groups:
        eligible = [
            (index, item) for index, item in enumerate(items)
            if item.get("kind") in ("poster", "custom") and matches(item)
        ]
        count = sum(item["qty"] for _, item in eligible)
        free_qty = count // threshold
        if free_qty and eligible:
            recipient_index, _ = min(eligible, key=lambda pair: pair[1]["unit_price"])
            allocations[recipient_index] = allocations.get(recipient_index, 0) + free_qty
    return allocations
ORDER_STATUSES = ["placed", "packed", "shipped", "delivered"]
LOCAL_POSTER_SEED = [
    ("Forza HORIZON 5", "WhatsApp Image 2026-09-14 at 7.59.46 PM.jpeg"),
    ("Valorant", "WhatsApp Image 2026-09-14 at 7.59.48 PM.jpeg"),
    ("Elden Ring", "WhatsApp Image 2026-09-14 at 7.59.50 PM (1).jpeg"),
    ("God of War Ragnork", "WhatsApp Image 2026-09-14 at 7.59.51 PM.jpeg"),
    ("Resident Evil Requiem", "WhatsApp Image 2026-09-14 at 7.59.53 PM (1).jpeg"),
    ("Forza HORIZON 5", "WhatsApp Image 2026-09-14 at 7.59.54 PM.jpeg"),
    ("Valorant", "WhatsApp Image 2026-09-14 at 7.59.57 PM (1).jpeg"),
    ("The Ghost of Yotei", "WhatsApp Image 2026-09-14 at 7.59.59 PM.jpeg"),
    ("The Last of Us Part 2 Remastered", "WhatsApp Image 2026-09-14 at 8.00.01 PM (1).jpeg"),
    ("Grand Theft Auto VI", "WhatsApp Image 2026-09-14 at 8.00.04 PM (1).jpeg"),
    ("Elden Ring", "WhatsApp Image 2026-09-14 at 8.00.05 PM (1).jpeg"),
    ("The Last of Us Part 2", "WhatsApp Image 2026-09-14 at 8.00.06 PM (1).jpeg"),
    ("Minecraft", "WhatsApp Image 2026-09-14 at 8.00.07 PM.jpeg"),
    ("The Last of Us Part 2", "WhatsApp Image 2026-09-14 at 8.00.08 PM.jpeg"),
    ("Red Dead Redemption", "WhatsApp Image 2026-09-14 at 8.00.08 PM (2).jpeg"),
    ("Uncharted 4 : A Thiefs End", "WhatsApp Image 2026-09-14 at 8.00.09 PM (1).jpeg"),
    ("Cyberpunk 2077", "WhatsApp Image 2026-09-14 at 8.00.10 PM.jpeg"),
    ("God of War", "WhatsApp Image 2026-09-19 at 3.50.10 PM.jpeg"),
    ("Counter-Strike 2", "WhatsApp Image 2026-09-19 at 3.50.12 PM.jpeg"),
    ("007 First Light", "WhatsApp Image 2026-09-19 at 3.50.11 PM (1).jpeg"),
    ("Uncharted 4: A Thief's End", "WhatsApp Image 2026-09-19 at 3.50.12 PM (2).jpeg"),
    ("The Last of Us Part 2", "WhatsApp Image 2026-09-19 at 4.15.37 PM.jpeg"),
]
storage_enabled = False

MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


def init_storage(force: bool = False):
    global storage_key, storage_enabled
    if storage_key and not force:
        return storage_key
    if not EMERGENT_KEY:
        storage_enabled = False
        return None
    resp = http_requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    storage_enabled = True
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = http_requests.put(f"{STORAGE_URL}/objects/{path}",
                             headers={"X-Storage-Key": key, "Content-Type": content_type},
                             data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = http_requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------- Transactional email (Emergent managed Resend) ----------
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Physicality")
APP_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str):
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                 headers={"X-Email-Key": EMAIL_KEY}, json=payload)
    resp.raise_for_status()
    return resp.json().get("id")


STATUS_HEADLINES = {
    "packed": "Your order is packed.",
    "shipped": "Your order has shipped.",
    "delivered": "Your order was delivered.",
}


def status_email_html(order: dict, new_status: str) -> str:
    steps = ["placed", "packed", "shipped", "delivered"]
    current = steps.index(new_status)
    progress = "".join(
        f'<span style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;'
        f'color:{"#C85A43" if i <= current else "#B9B2A6"}">{s}</span>'
        + ('<span style="color:#DED8CE;padding:0 8px">&mdash;</span>' if i < 3 else "")
        for i, s in enumerate(steps))
    rows = "".join(
        f'<tr><td style="padding:8px 0;border-bottom:1px solid #DED8CE;font-size:14px;color:#1C1C1A">'
        f'<em>{escape(i["title"])}</em>'
        f'<span style="font-family:Arial,sans-serif;font-size:11px;color:#5C5A56"> &middot; '
        f'{escape(str(i.get("size") or i.get("platform") or ""))} &times; {i["qty"]}</span></td></tr>'
        for i in order.get("items", []))
    tracking = ""
    if new_status in ("shipped", "delivered") and not order.get("promo_applied") and order.get("tracking_id"):
        delivery_option = f' <span style="color:#5C5A56">Delivery option &middot; {escape(order["delivery_option"])}</span>' if order.get("delivery_option") else ""
        courier = f' &mdash; {escape(order["courier"]) }' if order.get("courier") else ""
        tracking = (f'<p style="font-family:Arial,sans-serif;font-size:13px;color:#1C1C1A;margin:20px 0 0">'
                    f'Tracking &middot; <strong>{escape(order["tracking_id"])}</strong>{courier}{delivery_option}</p>')
    name = escape(order.get("shipping", {}).get("name", "collector").split(" ")[0])
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EAE4D9;padding:32px 16px">'
        '<tr><td align="center">'
        '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#F4F0EA;border:1px solid #1C1C1A;padding:40px">'
        '<tr><td>'
        '<p style="font-family:Arial,sans-serif;font-size:16px;letter-spacing:6px;margin:0;color:#1C1C1A">PHYSICALITY</p>'
        '<p style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#5C5A56;margin:6px 0 28px">Make digital tangible</p>'
        f'<p style="font-family:Georgia,serif;font-size:30px;margin:0 0 6px;color:#1C1C1A">{STATUS_HEADLINES[new_status]}</p>'
        f'<p style="font-family:Arial,sans-serif;font-size:13px;color:#5C5A56;margin:0 0 24px">Hi {name}, order <strong>{escape(order["order_no"])}</strong> just moved on the press bench.</p>'
        f'<p style="margin:0 0 24px">{progress}</p>'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table>'
        f'{tracking}'
        f'<p style="margin:28px 0 0"><a href="{APP_URL}/account" style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#F4F0EA;background:#C85A43;padding:12px 20px;text-decoration:none">View your order</a></p>'
        f'<p style="font-family:Arial,sans-serif;font-size:11px;color:#B9B2A6;margin:32px 0 0">Sent by {escape(EMAIL_FROM_NAME)}. We never ask for passwords or card details by email.</p>'
        '</td></tr></table></td></tr></table>')


# ---------- Mongo document helpers ----------
PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v))]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    def to_mongo(self) -> dict:
        return self.model_dump(by_alias=True, exclude={"id"})

    @classmethod
    def from_mongo(cls, doc: Optional[dict]):
        if doc is None:
            return None
        return cls(**doc)


class User(BaseDocument):
    email: str
    name: str
    role: str = "customer"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Product(BaseDocument):
    kind: str = "poster"
    title: str
    game: str
    edition: str
    blurb: str = ""
    image_url: Optional[str] = None
    image_path: Optional[str] = None
    prices: dict


# ---------- Auth ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(hours=12)}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def public_user(doc: dict) -> dict:
    return {"id": str(doc["_id"]), "email": doc["email"], "name": doc["name"],
            "role": doc.get("role", "customer"), "picture": doc.get("picture")}


def tracking_url(tracking_id: Optional[str], courier: Optional[str]) -> Optional[str]:
    if not tracking_id or not courier:
        return None
    key = courier.strip().lower().replace(" ", "")
    encoded_id = httpx.URL("https://tracking.invalid/").copy_with(path=tracking_id).path.lstrip("/")
    if key == "delhivery":
        return f"https://www.delhivery.com/track/package/{encoded_id}"
    if key == "indiapost":
        return f"https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignment={encoded_id}"
    return None


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    bearer = auth_header[7:] if auth_header.startswith("Bearer ") else None
    token = request.cookies.get("access_token") or bearer
    if token:
        try:
            payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
            if payload.get("type") == "access":
                user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
                if user:
                    return user
        except Exception:
            pass
    session_token = request.cookies.get("session_token") or bearer
    if session_token:
        sess = await db.user_sessions.find_one({"session_token": session_token})
        if sess:
            expires_at = sess["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at >= datetime.now(timezone.utc):
                user = await db.users.find_one({"_id": ObjectId(sess["user_id"])})
                if user:
                    return user
    raise HTTPException(status_code=401, detail="Not authenticated")


async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


@api_router.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.strip().lower()
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    doc = {"email": email, "name": body.name.strip(), "password_hash": hash_password(body.password),
           "role": "customer", "created_at": datetime.now(timezone.utc)}
    result = await db.users.insert_one(doc)
    access = create_access_token(str(result.inserted_id), email)
    refresh = create_refresh_token(str(result.inserted_id))
    set_auth_cookies(response, access, refresh)
    doc["_id"] = result.inserted_id
    return {"user": public_user(doc), "token": access}


@api_router.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.strip().lower()
    identifier = f"{request.client.host if request.client else 'unknown'}:{email}"
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("count", 0) >= 5:
        locked_until = attempts.get("locked_until")
        if locked_until and locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1},
             "$set": {"locked_until": datetime.now(timezone.utc) + timedelta(minutes=15)}},
            upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})
    access = create_access_token(str(user["_id"]), email)
    refresh = create_refresh_token(str(user["_id"]))
    set_auth_cookies(response, access, refresh)
    return {"user": public_user(user), "token": access}


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(str(user["_id"]), user["email"])
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    return {"token": access}
class GoogleLoginIn(BaseModel):
    credential: str


@api_router.get("/auth/google/config")
async def google_config():
    return {"configured": bool(GOOGLE_CLIENT_ID), "client_id": GOOGLE_CLIENT_ID or None}


@api_router.post("/auth/google")
async def google_login(body: GoogleLoginIn, response: Response):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google authentication is not configured"
        )

    try:
        google_user = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid Google credential"
        )

    email = google_user.get("email")
    google_id = google_user.get("sub")
    if not email or not google_id:
        raise HTTPException(
            status_code=400,
            detail="Google account information is incomplete"
        )

    email = email.strip().lower()
    name = google_user.get("name") or email.split("@")[0]
    picture = google_user.get("picture")

    if not google_user.get("email_verified"):
        raise HTTPException(
            status_code=400,
            detail="Google email is not verified"
        )

    user = await db.users.find_one({"google_id": google_id})

    if not user:
        user = await db.users.find_one({"email": email.lower()})

    if user:
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "google_id": google_id,
                    "picture": picture,
                    "name": name
                }
            }
        )

        user = await db.users.find_one({"_id": user["_id"]})

    else:
        result = await db.users.insert_one({
            "email": email.lower(),
            "name": name,
            "role": "customer",
            "password_hash": None,
            "google_id": google_id,
            "picture": picture,
            "created_at": datetime.now(timezone.utc)
        })

        user = await db.users.find_one({"_id": result.inserted_id})

    access = create_access_token(
        str(user["_id"]),
        user["email"]
    )

    refresh = create_refresh_token(
        str(user["_id"])
    )

    set_auth_cookies(
        response,
        access,
        refresh
    )

    return {
        "user": public_user(user),
        "token": access
    }

@api_router.post("/auth/forgot-password")
async def forgot_password(body: dict):
    email = (body.get("email") or "").strip().lower()
    user = await db.users.find_one({"email": email})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": str(user["_id"]),
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1), "used": False})
        logger.info(f"Password reset link for {email}: /reset-password?token={token}")
    return {"ok": True, "message": "If the email exists, a reset link has been generated."}


@api_router.post("/auth/reset-password")
async def reset_password(body: dict):
    token = body.get("token") or ""
    new_password = body.get("password") or ""
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    record = await db.password_reset_tokens.find_one({"token": token, "used": False})
    if not record or record["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset link is invalid or expired")
    await db.users.update_one({"_id": ObjectId(record["user_id"])},
                              {"$set": {"password_hash": hash_password(new_password)}})
    await db.password_reset_tokens.update_one({"_id": record["_id"]}, {"$set": {"used": True}})
    return {"ok": True}


# ---------- Products ----------
POSTER_SEED = [
    {"title": "Los Santos, After Dark", "game": "Grand Theft Auto V", "edition": "Nº 001",
     "blurb": "A city that never sleeps, pressed in warm ink.", "image_url": "https://images.pexels.com/photos/26594027/pexels-photo-26594027.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
    {"title": "The Nine Realms", "game": "God of War Ragnarök", "edition": "Nº 002",
     "blurb": "Father and son, frozen mid-journey on heavy stock.", "image_url": "https://images.pexels.com/photos/8108656/pexels-photo-8108656.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
    {"title": "Grace, Restored", "game": "Elden Ring", "edition": "Nº 003",
     "blurb": "The Erdtree in letterpress gold and bone.", "image_url": "https://images.unsplash.com/photo-1695634184046-93d24e779ea7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwzfHxtaW5pbWFsaXN0JTIwcG9zdGVyJTIwZnJhbWV8ZW58MHx8fHwxNzg3MzExMjMwfDA&ixlib=rb-4.1.0&q=85"},
    {"title": "Webbed skyline", "game": "Marvel's Spider-Man 2", "edition": "Nº 004",
     "blurb": "New York, swung through at golden hour.", "image_url": "https://images.unsplash.com/photo-1770259406678-420c4adc44f5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwyfHxtaW5pbWFsaXN0JTIwcG9zdGVyJTIwZnJhbWV8ZW58MHx8fHwxNzg3MzExMjMwfDA&ixlib=rb-4.1.0&q=85"},
    {"title": "The Last Campfire", "game": "Red Dead Redemption 2", "edition": "Nº 005",
     "blurb": "An elegy for the frontier, printed slow.", "image_url": "https://images.pexels.com/photos/26594027/pexels-photo-26594027.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
    {"title": "Cordyceps Spring", "game": "The Last of Us Part II", "edition": "Nº 006",
     "blurb": "Overgrown, quiet, and heavier than it looks.", "image_url": "https://images.pexels.com/photos/8108656/pexels-photo-8108656.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
    {"title": "Wind over Tsushima", "game": "Ghost of Tsushima", "edition": "Nº 007",
     "blurb": "A single reed of pampas grass, held forever.", "image_url": "https://images.unsplash.com/photo-1695634184046-93d24e779ea7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwzfHxtaW5pbWFsaXN0JTIwcG9zdGVyJTIwZnJhbWV8ZW58MHx8fHwxNzg3MzExMjMwfDA&ixlib=rb-4.1.0&q=85"},
    {"title": "Night City Obituary", "game": "Cyberpunk 2077", "edition": "Nº 008",
     "blurb": "Chrome and neon, flattened into ink.", "image_url": "https://images.unsplash.com/photo-1770259406678-420c4adc44f5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwyfHxtaW5pbWFsaXN0JTIwcG9zdGVyJTIwZnJhbWV8ZW58MHx8fHwxNzg3MzExMjMwfDA&ixlib=rb-4.1.0&q=85"},
]


@api_router.get("/products/posters")
async def list_posters():
    docs = await db.products.find({"kind": "poster", "catalog_source": "local"}).sort("edition", 1).to_list(100)
    return [Product.from_mongo(d).model_dump() for d in docs]


@api_router.get("/pricing")
async def pricing():
    return {
        "posters": POSTER_PRICES,
        "poster_list_prices": POSTER_LIST_PRICES,
        "poster_discount_percent": POSTER_DISCOUNT_PERCENT,
        "cover": COVER_PRICE,
        "platforms": PLATFORMS,
    }


# ---------- Uploads ----------
@api_router.post("/upload")
async def upload(file: UploadFile = File(...), user: Optional[dict] = Depends(get_optional_user)):
    ext = (file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "bin").lower()
    if ext not in MIME_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG or WEBP images are accepted")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 8 MB")
    owner = str(user["_id"]) if user else "guest"
    path = f"{APP_NAME}/uploads/{owner}/{uuid.uuid4()}.{ext}"
    content_type = MIME_TYPES[ext]
    driver = "remote"
    if storage_enabled:
        try:
            result = put_object(path, data, content_type)
            path = result["path"]
        except Exception as e:
            logger.error(f"Remote storage failed, falling back to local: {e}")
            driver = "local"
    else:
        driver = "local"
    if driver == "local":
        (UPLOAD_DIR / path.replace("/", "_")).write_bytes(data)
    await db.files.insert_one({
        "storage_path": path, "original_filename": file.filename, "content_type": content_type,
        "size": len(data), "driver": driver, "data": data if driver == "local" else None,
        "user_id": owner if user else None, "is_deleted": False,
        "created_at": datetime.now(timezone.utc)})
    return {"path": path}


@api_router.get("/files/{path:path}")
async def download_file(path: str, authorization: str = Header(None), auth: str = Query(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif auth:
        token = auth
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    if token:
        decode_token(token)
    else:
        public_product = await db.products.find_one({"kind": "poster", "image_path": path})
        if not public_product:
            raise HTTPException(status_code=401, detail="Not authenticated")
    if record.get("driver") == "remote" and storage_enabled:
        data, ct = get_object(path)
        return RawResponse(content=data, media_type=record.get("content_type", ct))
    local = UPLOAD_DIR / path.replace("/", "_")
    if local.exists():
        return RawResponse(content=local.read_bytes(), media_type=record.get("content_type", "application/octet-stream"))
    if record.get("data") is not None:
        return RawResponse(content=bytes(record["data"]), media_type=record.get("content_type", "application/octet-stream"))
    if not local.exists():
        raise HTTPException(status_code=404, detail="File not found")


# ---------- Orders ----------
class OrderItemIn(BaseModel):
    kind: str
    product_id: Optional[str] = None
    size: Optional[str] = None
    framing: Optional[str] = None
    platform: Optional[str] = None
    game_name: Optional[str] = None
    image_path: Optional[str] = None
    qty: int = 1


class ShippingIn(BaseModel):
    name: str
    phone: str
    address: str
    city: str
    state: str
    pincode: str


class OrderCreate(BaseModel):
    items: List[OrderItemIn]
    promo_code: Optional[str] = None
    shipping: ShippingIn


def order_response(doc: dict, include_tracking: bool = True) -> dict:
    out = {
        "id": str(doc["_id"]), "order_no": doc["order_no"], "items": doc["items"],
        "subtotal": doc["subtotal"], "discount": doc["discount"], "total": doc["total"],
        "promo_applied": doc.get("promo_applied", False), "status": doc["status"],
        "payment_status": doc["payment_status"], "payment_id": doc.get("payment_id"),
        "shipping": doc.get("shipping"), "user_email": doc.get("user_email"),
        "delivery_option": doc.get("delivery_option"), "status_history": doc.get("status_history", []),
        "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }
    if include_tracking:
        out["tracking_id"] = doc.get("tracking_id")
        out["courier"] = doc.get("courier")
        out["tracking_url"] = doc.get("tracking_url") or tracking_url(doc.get("tracking_id"), doc.get("courier"))
    return out


@api_router.post("/orders")
async def create_order(body: OrderCreate, user: dict = Depends(get_current_user)):
    if not body.items:
        raise HTTPException(status_code=400, detail="Your order is empty")
    promo_applied = False
    if body.promo_code and body.promo_code.strip():
        if body.promo_code.strip() != PROMO_CODE:
            raise HTTPException(status_code=400, detail="That code is not valid")
        promo_applied = True

    line_items = []
    subtotal = 0
    discount = 0
    for item in body.items:
        qty = max(1, min(item.qty, 20))
        if item.kind in ("poster", "custom"):
            if item.size not in POSTER_PRICES:
                raise HTTPException(status_code=400, detail="Pick a sheet size: A4, A3 or A5")
            framing = item.framing if item.framing in ("framed", "unframed") else "unframed"
            if framing not in POSTER_PRICES[item.size]:
                framing = "unframed"
            unit = 1 if promo_applied else POSTER_PRICES[item.size][framing]
            if item.kind == "poster":
                if item.product_id:
                    product = await db.products.find_one({"_id": ObjectId(item.product_id)})
                    if not product:
                        raise HTTPException(status_code=400, detail="Poster no longer available")
                    title, game, image_url, image_path = product["title"], product["game"], product["image_url"], None
                else:
                    if not item.game_name or not item.game_name.strip():
                        raise HTTPException(status_code=400, detail="Tell us which game you want printed")
                    game = item.game_name.strip()
                    title, image_url, image_path = f"{game} — Game Poster", None, None
            else:
                if not item.image_path:
                    raise HTTPException(status_code=400, detail="Custom posters need an uploaded image")
                title, game, image_url, image_path = "Custom poster", "Your artwork", None, item.image_path
            line_items.append({"kind": item.kind, "title": title, "game": game, "size": item.size,
                               "framing": framing, "qty": qty, "unit_price": unit,
                               "image_url": image_url, "image_path": image_path})
        elif item.kind == "cover":
            if not item.game_name or item.platform not in PLATFORMS:
                raise HTTPException(status_code=400, detail="Cover art needs a game name and platform")
            unit = 1 if promo_applied else COVER_PRICE
            line_items.append({"kind": "cover", "title": f"{item.game_name.strip()} — DVD Cover Box",
                               "game": item.game_name.strip(), "platform": item.platform, "qty": qty,
                               "unit_price": unit, "includes_free_a5": True})
        else:
            raise HTTPException(status_code=400, detail="Unknown item type")
        line_total = unit * qty
        subtotal += line_total

    if not promo_applied:
        for item_index, free_qty in offer_freebie_allocations(line_items).items():
            paid_item = line_items[item_index]
            discount += paid_item["unit_price"] * free_qty
            line_items.append({**paid_item, "qty": free_qty, "unit_price": 0, "is_free": True})

    total = subtotal - discount
    counter = await db.counters.find_one_and_update(
        {"_id": "order_no"}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER)
    order_no = f"PE-{1000 + counter['seq']}"
    now = datetime.now(timezone.utc)
    doc = {
        "order_no": order_no, "user_id": str(user["_id"]), "user_email": user["email"],
        "items": line_items, "subtotal": subtotal, "discount": discount, "total": total,
        "promo_applied": promo_applied, "status": "placed", "payment_status": "pending",
        "payment_id": None, "razorpay_order_id": None, "tracking_id": None, "courier": None,
        "delivery_option": None, "shipping": body.shipping.model_dump(), "created_at": now,
        "status_history": [{"status": "placed", "at": now.isoformat()}],
    }
    result = await db.orders.insert_one(doc)
    doc["_id"] = result.inserted_id
    return order_response(doc)


@api_router.get("/orders")
async def my_orders(user: dict = Depends(get_current_user)):
    docs = await db.orders.find({"user_id": str(user["_id"])}).sort("created_at", -1).to_list(200)
    return [order_response(d, include_tracking=not d.get("promo_applied", False)) for d in docs]


@api_router.get("/orders/track")
async def track_order(order_no: str = Query(..., min_length=3), email: str = Query(..., min_length=3)):
    order = await db.orders.find_one({"order_no": order_no.strip().upper(), "user_email": email.strip().lower()})
    if not order:
        raise HTTPException(status_code=404, detail="We could not find an order with those details")
    response = order_response(order, include_tracking=not order.get("promo_applied", False))
    return {key: response[key] for key in ("order_no", "status", "status_history", "delivery_option", "tracking_id", "courier", "tracking_url", "created_at") if key in response}


# ---------- Payments (Razorpay) ----------
def razorpay_client():
    key = os.environ.get("RAZORPAY_KEY_ID", "").strip()
    secret = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
    if not key or not secret or razorpay is None:
        return None
    return razorpay.Client(auth=(key, secret))


def mock_payments_enabled() -> bool:
    return os.environ.get("ALLOW_MOCK_PAYMENTS", "").strip().lower() in {"1", "true", "yes"}


@api_router.get("/payments/config")
async def payments_config():
    key = os.environ.get("RAZORPAY_KEY_ID", "").strip()
    configured = bool(razorpay_client())
    return {
        "configured": configured,
        "mock_enabled": not configured and mock_payments_enabled(),
        "key_id": key or None,
    }


async def get_payable_order(order_id: str, user: dict) -> dict:
    order = await db.orders.find_one({"_id": ObjectId(order_id), "user_id": str(user["_id"])})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["payment_status"] == "paid":
        raise HTTPException(status_code=400, detail="This order is already paid")
    return order


@api_router.post("/payments/razorpay-order")
async def create_razorpay_order(body: dict, user: dict = Depends(get_current_user)):
    rz = razorpay_client()
    if not rz:
        raise HTTPException(status_code=503, detail="Payment gateway is not configured yet")
    order = await get_payable_order(body.get("order_id", ""), user)
    try:
        rz_order = rz.order.create({"amount": order["total"] * 100, "currency": "INR",
                                    "payment_capture": 1, "receipt": order["order_no"][:40]})
    except Exception as exc:
        logger.exception("Razorpay order creation failed")
        error_message = str(exc).casefold()
        if any(message in error_message for message in ("authentication", "invalid key", "unauthorized", "401")):
            raise HTTPException(
                status_code=502,
                detail="Razorpay authentication failed. Set matching RAZORPAY_KEY_ID and "
                       "RAZORPAY_KEY_SECRET values from the same test or live mode in the backend environment.",
            ) from exc
        raise HTTPException(
            status_code=502,
            detail="Razorpay could not create the payment order. Please try again later.",
        ) from exc
    await db.orders.update_one({"_id": order["_id"]}, {"$set": {"razorpay_order_id": rz_order["id"]}})
    return {"razorpay_order_id": rz_order["id"], "amount": rz_order["amount"], "currency": "INR",
            "key_id": os.environ.get("RAZORPAY_KEY_ID", "").strip()}


@api_router.post("/payments/verify")
async def verify_payment(body: dict, user: dict = Depends(get_current_user)):
    rz = razorpay_client()
    if not rz:
        raise HTTPException(status_code=503, detail="Payment gateway is not configured yet")
    order = await get_payable_order(body.get("order_id", ""), user)
    razorpay_order_id = body.get("razorpay_order_id", "")
    if not order.get("razorpay_order_id") or razorpay_order_id != order["razorpay_order_id"]:
        raise HTTPException(status_code=400, detail="Payment order does not match this order")
    try:
        rz.utility.verify_payment_signature({
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": body.get("razorpay_payment_id", ""),
            "razorpay_signature": body.get("razorpay_signature", ""),
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Payment signature verification failed")
    await db.orders.update_one({"_id": order["_id"]},
                               {"$set": {"payment_status": "paid",
                                         "payment_id": body.get("razorpay_payment_id")}})
    return {"ok": True}


@api_router.post("/payments/mock-pay")
async def mock_pay(body: dict, user: dict = Depends(get_current_user)):
    if razorpay_client():
        raise HTTPException(status_code=400, detail="Gateway is live — use the real checkout")
    if not mock_payments_enabled():
        raise HTTPException(status_code=503, detail="Mock payments are disabled")
    order = await get_payable_order(body.get("order_id", ""), user)
    payment_id = f"MOCKPAY-{uuid.uuid4().hex[:10].upper()}"
    await db.orders.update_one({"_id": order["_id"]},
                               {"$set": {"payment_status": "paid", "payment_id": payment_id}})
    return {"ok": True, "payment_id": payment_id}


# ---------- Admin ----------
class AdminOrderUpdate(BaseModel):
    status: Optional[str] = None
    tracking_id: Optional[str] = None
    courier: Optional[str] = None
    delivery_option: Optional[str] = None
    tracking_url: Optional[str] = None


@api_router.get("/admin/orders")
async def admin_orders(admin: dict = Depends(require_admin)):
    docs = await db.orders.find({}).sort("created_at", -1).to_list(500)
    return [order_response(d) for d in docs]


@api_router.patch("/admin/orders/{order_id}")
async def admin_update_order(order_id: str, body: AdminOrderUpdate, admin: dict = Depends(require_admin)):
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    updates = {}
    if body.status:
        if body.status not in ORDER_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        if body.status in ("shipped", "delivered") and order.get("payment_status") != "paid":
            raise HTTPException(status_code=400, detail="Only paid orders can be marked shipped or delivered")
        updates["status"] = body.status
    if body.tracking_id is not None:
        updates["tracking_id"] = body.tracking_id.strip() or None
    if body.courier is not None:
        updates["courier"] = body.courier.strip() or None
    if body.delivery_option is not None:
        updates["delivery_option"] = body.delivery_option.strip() or None
    if body.tracking_url is not None:
        partner_url = body.tracking_url.strip() or None
        if partner_url and urlparse(partner_url).scheme not in ("http", "https"):
            raise HTTPException(status_code=400, detail="Partner tracking link must start with http:// or https://")
        updates["tracking_url"] = partner_url
    if not updates:
        return order_response(order)
    push = None
    if body.status and body.status != order.get("status"):
        push = {"status_history": {"status": body.status, "at": datetime.now(timezone.utc).isoformat()}}
    update_q = {"$set": updates}
    if push:
        update_q["$push"] = push
    await db.orders.update_one({"_id": order["_id"]}, update_q)
    updated = await db.orders.find_one({"_id": order["_id"]})
    status_changed = body.status and body.status != order.get("status")
    tracking_added = updates.get("tracking_id") and updates.get("tracking_id") != order.get("tracking_id")
    if (status_changed and body.status in STATUS_HEADLINES) or (tracking_added and order.get("status") in ("shipped", "delivered")):
        try:
            subject = (f'{updated["order_no"]} — {STATUS_HEADLINES[body.status]}'
                       if status_changed and body.status in STATUS_HEADLINES
                       else f'{updated["order_no"]} — Your tracking details are ready')
            await send_email(
                to=updated["user_email"],
                subject=subject,
                html=status_email_html(updated, updated["status"]))
            logger.info(f"Order update email sent for {updated['order_no']}")
        except Exception as e:
            logger.error(f"Status email failed for {updated.get('order_no')}: {e}")
    return order_response(updated)


class ProductIn(BaseModel):
    title: str
    game: str
    edition: Optional[str] = None
    blurb: Optional[str] = ""
    image_url: Optional[str] = None
    image_path: Optional[str] = None


@api_router.post("/admin/products")
async def admin_create_product(body: ProductIn, admin: dict = Depends(require_admin)):
    edition = body.edition or f"Nº {await db.products.count_documents({'kind': 'poster'}) + 1:03d}"
    doc = Product(kind="poster", title=body.title.strip(), game=body.game.strip(), edition=edition,
                  blurb=body.blurb or "", image_url=body.image_url, image_path=body.image_path,
                  prices=POSTER_PRICES)
    result = await db.products.insert_one(doc.to_mongo())
    return Product.from_mongo(await db.products.find_one({"_id": result.inserted_id})).model_dump()


@api_router.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, body: ProductIn, admin: dict = Depends(require_admin)):
    updates = {k: v for k, v in body.model_dump().items()}
    result = await db.products.update_one({"_id": ObjectId(product_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Edition not found")
    return Product.from_mongo(await db.products.find_one({"_id": ObjectId(product_id)})).model_dump()


@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, admin: dict = Depends(require_admin)):
    result = await db.products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Edition not found")
    return {"ok": True}


# ---------- Misc ----------
@api_router.get("/")
async def root():
    return {"message": "Physicality — press API online"}


app.include_router(api_router)

frontend_origins = {
    origin.strip().rstrip("/")
    for origin in os.environ.get("FRONTEND_URL", "http://localhost:3000").split(",")
    if origin.strip()
}
allowed_origins = {
    *frontend_origins,
    "https://www.physicality.in",
    "https://physicality.in",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://localhost:3000",
    "https://127.0.0.1:3000",
}
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_password),
                                   "name": "Press Administrator", "role": "admin",
                                   "created_at": datetime.now(timezone.utc)})
        logger.info(f"Seeded admin account: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})


async def seed_products():
    for index, (game, image_name) in enumerate(LOCAL_POSTER_SEED, start=1):
        edition = str(index).zfill(3)
        await db.products.update_one(
            {"catalog_key": f"local-poster-{edition}"},
            {"$set": {
                "kind": "poster",
                "title": game,
                "game": game,
                "edition": edition,
                "blurb": "",
                "image_url": f"/images/{image_name}",
                "image_path": None,
                "prices": POSTER_PRICES,
                "catalog_source": "local",
                "catalog_key": f"local-poster-{edition}",
            }},
            upsert=True,
        )
    logger.info(f"Upserted {len(LOCAL_POSTER_SEED)} local poster products")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("catalog_key", unique=True, sparse=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.orders.create_index("user_id")
    await db.user_sessions.create_index("session_token")
    await seed_admin()
    await seed_products()
    try:
        if init_storage():
            logger.info("Object storage initialized")
        else:
            logger.warning("EMERGENT_LLM_KEY is not configured; using durable MongoDB upload fallback")
    except Exception as e:
        logger.warning(f"Object storage unavailable; using durable MongoDB upload fallback: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
