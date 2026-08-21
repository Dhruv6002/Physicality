from dotenv import load_dotenv
load_dotenv()

import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, List, Optional

import bcrypt
import jwt
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
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
PROMO_CODE = "FREEHOSTEL5050"
POSTER_PRICES = {
    "A4": {"framed": 259, "unframed": 149},
    "A3": {"framed": 399, "unframed": 179},
    "A5": {"unframed": 89},
}
COVER_PRICE = 199
PLATFORMS = ["PlayStation", "Xbox", "PC"]
ORDER_STATUSES = ["placed", "packed", "shipped", "delivered"]

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# ---------- Object storage (Emergent) with local-disk fallback ----------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "physical-editions"
storage_key = None
storage_enabled = False

MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


def init_storage(force: bool = False):
    global storage_key, storage_enabled
    if storage_key and not force:
        return storage_key
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
    blurb: str
    image_url: str
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
            "role": doc.get("role", "customer")}


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


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
    if not user or not verify_password(body.password, user["password_hash"]):
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
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
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
    docs = await db.products.find({"kind": "poster"}).sort("edition", 1).to_list(100)
    return [Product.from_mongo(d).model_dump() for d in docs]


@api_router.get("/pricing")
async def pricing():
    return {"posters": POSTER_PRICES, "cover": COVER_PRICE, "platforms": PLATFORMS}


# ---------- Uploads ----------
@api_router.post("/upload")
async def upload(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = (file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "bin").lower()
    if ext not in MIME_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG or WEBP images are accepted")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 8 MB")
    path = f"{APP_NAME}/uploads/{user['_id']}/{uuid.uuid4()}.{ext}"
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
        "size": len(data), "driver": driver, "user_id": str(user["_id"]), "is_deleted": False,
        "created_at": datetime.now(timezone.utc)})
    return {"path": path}


@api_router.get("/files/{path:path}")
async def download_file(path: str, authorization: str = Header(None), auth: str = Query(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    decode_token(token)
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    if record.get("driver") == "remote" and storage_enabled:
        data, ct = get_object(path)
        return RawResponse(content=data, media_type=record.get("content_type", ct))
    local = UPLOAD_DIR / path.replace("/", "_")
    if not local.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return RawResponse(content=local.read_bytes(), media_type=record.get("content_type", "application/octet-stream"))


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
        "status_history": doc.get("status_history", []),
        "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }
    if include_tracking:
        out["tracking_id"] = doc.get("tracking_id")
        out["courier"] = doc.get("courier")
    return out


@api_router.post("/orders")
async def create_order(body: OrderCreate, user: dict = Depends(get_current_user)):
    if not body.items:
        raise HTTPException(status_code=400, detail="Your order is empty")
    promo_applied = False
    if body.promo_code and body.promo_code.strip():
        if body.promo_code.strip().upper() != PROMO_CODE:
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
            unit = POSTER_PRICES[item.size][framing]
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
                title, game, image_url, image_path = "Custom Commission", "Your artwork", None, item.image_path
            line_items.append({"kind": item.kind, "title": title, "game": game, "size": item.size,
                               "framing": framing, "qty": qty, "unit_price": unit,
                               "image_url": image_url, "image_path": image_path})
        elif item.kind == "cover":
            if not item.game_name or item.platform not in PLATFORMS:
                raise HTTPException(status_code=400, detail="Cover art needs a game name and platform")
            line_items.append({"kind": "cover", "title": f"{item.game_name.strip()} — DVD Cover Box",
                               "game": item.game_name.strip(), "platform": item.platform, "qty": qty,
                               "unit_price": COVER_PRICE, "includes_free_a5": True})
        else:
            raise HTTPException(status_code=400, detail="Unknown item type")
        line_total = unit * qty
        subtotal += line_total
        if promo_applied and item.kind in ("poster", "custom"):
            discount += line_total // 2

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
        "shipping": body.shipping.model_dump(), "created_at": now,
        "status_history": [{"status": "placed", "at": now.isoformat()}],
    }
    result = await db.orders.insert_one(doc)
    doc["_id"] = result.inserted_id
    return order_response(doc)


@api_router.get("/orders")
async def my_orders(user: dict = Depends(get_current_user)):
    docs = await db.orders.find({"user_id": str(user["_id"])}).sort("created_at", -1).to_list(200)
    return [order_response(d, include_tracking=not d.get("promo_applied", False)) for d in docs]


# ---------- Payments (Razorpay) ----------
def razorpay_client():
    key = os.environ.get("RAZORPAY_KEY_ID", "").strip()
    secret = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
    if not key or not secret or razorpay is None:
        return None
    return razorpay.Client(auth=(key, secret))


@api_router.get("/payments/config")
async def payments_config():
    key = os.environ.get("RAZORPAY_KEY_ID", "").strip()
    return {"configured": bool(razorpay_client()), "key_id": key or None}


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
    rz_order = rz.order.create({"amount": order["total"] * 100, "currency": "INR",
                                "payment_capture": 1, "receipt": order["order_no"][:40]})
    await db.orders.update_one({"_id": order["_id"]}, {"$set": {"razorpay_order_id": rz_order["id"]}})
    return {"razorpay_order_id": rz_order["id"], "amount": rz_order["amount"], "currency": "INR",
            "key_id": os.environ.get("RAZORPAY_KEY_ID")}


@api_router.post("/payments/verify")
async def verify_payment(body: dict, user: dict = Depends(get_current_user)):
    rz = razorpay_client()
    if not rz:
        raise HTTPException(status_code=503, detail="Payment gateway is not configured yet")
    order = await get_payable_order(body.get("order_id", ""), user)
    try:
        rz.utility.verify_payment_signature({
            "razorpay_order_id": body.get("razorpay_order_id", ""),
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
        updates["status"] = body.status
    if body.tracking_id is not None:
        updates["tracking_id"] = body.tracking_id.strip() or None
    if body.courier is not None:
        updates["courier"] = body.courier.strip() or None
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
    return order_response(updated)


# ---------- Misc ----------
@api_router.get("/")
async def root():
    return {"message": "Physical Editions — press API online"}


app.include_router(api_router)

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
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
    await db.products.delete_many({"kind": "poster"})
    for p in POSTER_SEED:
        doc = Product(kind="poster", prices=POSTER_PRICES, **p)
        await db.products.insert_one(doc.to_mongo())
    logger.info(f"Seeded {len(POSTER_SEED)} poster prints")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.orders.create_index("user_id")
    await seed_admin()
    await seed_products()
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Object storage init failed, using local disk fallback: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
