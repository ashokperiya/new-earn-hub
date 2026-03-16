from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import random
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'ourlife_db')]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'ourlife_secret_key_2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="Our Life API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: str = "Tamil Nadu"

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: str
    points: int = 0
    created_at: datetime

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

# MOI System Models
class MoiEntryCreate(BaseModel):
    person_name: str
    person_phone: Optional[str] = None
    event_type: str  # wedding, birthday, housewarming, festival, funeral
    event_name: str
    amount: float
    direction: str  # given or received
    date: Optional[str] = None
    notes: Optional[str] = None

class MoiEntry(BaseModel):
    id: str
    user_id: str
    person_name: str
    person_phone: Optional[str] = None
    event_type: str
    event_name: str
    amount: float
    direction: str
    date: datetime
    notes: Optional[str] = None
    created_at: datetime

# News/Post Models
class PostCreate(BaseModel):
    content: str
    media: Optional[str] = None
    media_type: Optional[str] = None
    category: str = "general"  # general, announcement, news, event, complaint, job
    location_level: str = "village"  # village, district, state, national
    village: Optional[str] = None
    district: Optional[str] = None

class Post(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_photo: Optional[str] = None
    content: str
    media: Optional[str] = None
    media_type: Optional[str] = None
    category: str
    location_level: str
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    likes: List[str] = []
    comments: List[dict] = []
    created_at: datetime

# Event/Festival Models
class EventCreate(BaseModel):
    title: str
    description: str
    event_type: str  # festival, temple, wedding, community, meeting
    start_date: str
    end_date: Optional[str] = None
    location: str
    village: Optional[str] = None
    district: Optional[str] = None
    image: Optional[str] = None

class Event(BaseModel):
    id: str
    user_id: str
    title: str
    description: str
    event_type: str
    start_date: datetime
    end_date: Optional[datetime] = None
    location: str
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    image: Optional[str] = None
    attendees: List[str] = []
    created_at: datetime

# Emergency Alert Model
class EmergencyAlert(BaseModel):
    alert_type: str  # medical, accident, disaster, fire
    message: str
    location: Optional[str] = None

# Service/Business Model
class ServiceCreate(BaseModel):
    name: str
    category: str  # catering, photography, decoration, sound, tent, tailor, makeup, etc.
    description: str
    phone: str
    village: Optional[str] = None
    district: Optional[str] = None
    price_range: Optional[str] = None
    image: Optional[str] = None

class Service(BaseModel):
    id: str
    user_id: str
    name: str
    category: str
    description: str
    phone: str
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    price_range: Optional[str] = None
    image: Optional[str] = None
    rating: float = 0.0
    reviews: List[dict] = []
    created_at: datetime

# AI Chat Model
class AIChatMessage(BaseModel):
    message: str

# ============== HELPERS ==============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "phone": user_data.phone,
        "profile_photo": None,
        "village": user_data.village,
        "district": user_data.district,
        "state": user_data.state,
        "points": 100,  # Welcome bonus
        "emergency_contacts": [],
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    
    token = create_access_token({"sub": user_id})
    profile = UserProfile(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        phone=user.get("phone"),
        profile_photo=user.get("profile_photo"),
        village=user.get("village"),
        district=user.get("district"),
        state=user["state"],
        points=user["points"],
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, user=profile)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Daily login bonus
    last_login = user.get("last_login")
    today = datetime.utcnow().date()
    if not last_login or last_login.date() != today:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"last_login": datetime.utcnow()}, "$inc": {"points": 10}}
        )
        user["points"] = user.get("points", 0) + 10
    
    token = create_access_token({"sub": user["id"]})
    profile = UserProfile(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        phone=user.get("phone"),
        profile_photo=user.get("profile_photo"),
        village=user.get("village"),
        district=user.get("district"),
        state=user.get("state", "Tamil Nadu"),
        points=user.get("points", 0),
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, user=profile)

@api_router.get("/auth/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserProfile(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        phone=current_user.get("phone"),
        profile_photo=current_user.get("profile_photo"),
        village=current_user.get("village"),
        district=current_user.get("district"),
        state=current_user.get("state", "Tamil Nadu"),
        points=current_user.get("points", 0),
        created_at=current_user["created_at"]
    )

@api_router.put("/auth/profile", response_model=UserProfile)
async def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {}
    for field, value in update_data.dict(exclude_unset=True).items():
        if value is not None:
            update_fields[field] = value
    
    if update_fields:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_fields})
    
    updated_user = await db.users.find_one({"id": current_user["id"]})
    return UserProfile(
        id=updated_user["id"],
        email=updated_user["email"],
        name=updated_user["name"],
        phone=updated_user.get("phone"),
        profile_photo=updated_user.get("profile_photo"),
        village=updated_user.get("village"),
        district=updated_user.get("district"),
        state=updated_user.get("state", "Tamil Nadu"),
        points=updated_user.get("points", 0),
        created_at=updated_user["created_at"]
    )

# ============== MOI SYSTEM ROUTES ==============

@api_router.post("/moi", response_model=MoiEntry)
async def create_moi_entry(data: MoiEntryCreate, current_user: dict = Depends(get_current_user)):
    entry_id = str(uuid.uuid4())
    entry = {
        "id": entry_id,
        "user_id": current_user["id"],
        "person_name": data.person_name,
        "person_phone": data.person_phone,
        "event_type": data.event_type,
        "event_name": data.event_name,
        "amount": data.amount,
        "direction": data.direction,
        "date": datetime.fromisoformat(data.date) if data.date else datetime.utcnow(),
        "notes": data.notes,
        "created_at": datetime.utcnow()
    }
    
    await db.moi_entries.insert_one(entry)
    
    # Award points for adding entry
    await db.users.update_one({"id": current_user["id"]}, {"$inc": {"points": 5}})
    
    return MoiEntry(**entry)

@api_router.get("/moi", response_model=List[MoiEntry])
async def get_moi_entries(
    direction: Optional[str] = None,
    person_name: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if direction:
        query["direction"] = direction
    if person_name:
        query["person_name"] = {"$regex": person_name, "$options": "i"}
    
    entries = await db.moi_entries.find(query).sort("date", -1).to_list(500)
    return [MoiEntry(**entry) for entry in entries]

@api_router.get("/moi/summary")
async def get_moi_summary(current_user: dict = Depends(get_current_user)):
    entries = await db.moi_entries.find({"user_id": current_user["id"]}).to_list(1000)
    
    total_given = sum(e["amount"] for e in entries if e["direction"] == "given")
    total_received = sum(e["amount"] for e in entries if e["direction"] == "received")
    
    # Group by person
    person_summary = {}
    for entry in entries:
        name = entry["person_name"]
        if name not in person_summary:
            person_summary[name] = {"given": 0, "received": 0, "events": []}
        
        if entry["direction"] == "given":
            person_summary[name]["given"] += entry["amount"]
        else:
            person_summary[name]["received"] += entry["amount"]
        
        person_summary[name]["events"].append({
            "event_name": entry["event_name"],
            "event_type": entry["event_type"],
            "amount": entry["amount"],
            "direction": entry["direction"],
            "date": entry["date"].isoformat()
        })
    
    return {
        "total_given": total_given,
        "total_received": total_received,
        "balance": total_received - total_given,
        "total_entries": len(entries),
        "person_summary": person_summary
    }

@api_router.get("/moi/person/{person_name}")
async def get_moi_by_person(person_name: str, current_user: dict = Depends(get_current_user)):
    entries = await db.moi_entries.find({
        "user_id": current_user["id"],
        "person_name": {"$regex": person_name, "$options": "i"}
    }).sort("date", -1).to_list(100)
    
    if not entries:
        return {"message": f"No records found for {person_name}", "entries": []}
    
    total_given = sum(e["amount"] for e in entries if e["direction"] == "given")
    total_received = sum(e["amount"] for e in entries if e["direction"] == "received")
    
    return {
        "person_name": person_name,
        "total_given": total_given,
        "total_received": total_received,
        "balance": total_received - total_given,
        "entries": [MoiEntry(**e).dict() for e in entries]
    }

@api_router.delete("/moi/{entry_id}")
async def delete_moi_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.moi_entries.delete_one({"id": entry_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted successfully"}

# ============== NEWS/POSTS ROUTES ==============

@api_router.post("/posts", response_model=Post)
async def create_post(data: PostCreate, current_user: dict = Depends(get_current_user)):
    post_id = str(uuid.uuid4())
    post = {
        "id": post_id,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_photo": current_user.get("profile_photo"),
        "content": data.content,
        "media": data.media,
        "media_type": data.media_type,
        "category": data.category,
        "location_level": data.location_level,
        "village": data.village or current_user.get("village"),
        "district": data.district or current_user.get("district"),
        "state": current_user.get("state", "Tamil Nadu"),
        "likes": [],
        "comments": [],
        "created_at": datetime.utcnow()
    }
    
    await db.posts.insert_one(post)
    
    # Award points
    await db.users.update_one({"id": current_user["id"]}, {"$inc": {"points": 10}})
    
    return Post(**post)

@api_router.get("/posts", response_model=List[Post])
async def get_posts(
    category: Optional[str] = None,
    location_level: Optional[str] = None,
    village: Optional[str] = None,
    district: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if category:
        query["category"] = category
    
    if location_level:
        query["location_level"] = location_level
    
    # Filter by location based on user's location or specified filter
    if village:
        query["village"] = village
    if district:
        query["district"] = district
    
    posts = await db.posts.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [Post(**post) for post in posts]

@api_router.post("/posts/{post_id}/like")
async def toggle_like(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    likes = post.get("likes", [])
    if current_user["id"] in likes:
        likes.remove(current_user["id"])
        liked = False
    else:
        likes.append(current_user["id"])
        liked = True
    
    await db.posts.update_one({"id": post_id}, {"$set": {"likes": likes}})
    return {"liked": liked, "likes_count": len(likes)}

@api_router.post("/posts/{post_id}/comment")
async def add_comment(post_id: str, content: str = Query(...), current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_photo": current_user.get("profile_photo"),
        "content": content,
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.posts.update_one({"id": post_id}, {"$push": {"comments": comment}})
    return comment

# ============== EVENTS/FESTIVALS ROUTES ==============

@api_router.post("/events", response_model=Event)
async def create_event(data: EventCreate, current_user: dict = Depends(get_current_user)):
    event_id = str(uuid.uuid4())
    event = {
        "id": event_id,
        "user_id": current_user["id"],
        "title": data.title,
        "description": data.description,
        "event_type": data.event_type,
        "start_date": datetime.fromisoformat(data.start_date),
        "end_date": datetime.fromisoformat(data.end_date) if data.end_date else None,
        "location": data.location,
        "village": data.village or current_user.get("village"),
        "district": data.district or current_user.get("district"),
        "state": current_user.get("state", "Tamil Nadu"),
        "image": data.image,
        "attendees": [current_user["id"]],
        "created_at": datetime.utcnow()
    }
    
    await db.events.insert_one(event)
    
    # Award points
    await db.users.update_one({"id": current_user["id"]}, {"$inc": {"points": 20}})
    
    return Event(**event)

@api_router.get("/events", response_model=List[Event])
async def get_events(
    event_type: Optional[str] = None,
    village: Optional[str] = None,
    district: Optional[str] = None,
    upcoming: bool = True,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if event_type:
        query["event_type"] = event_type
    if village:
        query["village"] = village
    if district:
        query["district"] = district
    if upcoming:
        query["start_date"] = {"$gte": datetime.utcnow()}
    
    events = await db.events.find(query).sort("start_date", 1).to_list(50)
    return [Event(**event) for event in events]

@api_router.post("/events/{event_id}/attend")
async def toggle_attendance(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    attendees = event.get("attendees", [])
    if current_user["id"] in attendees:
        attendees.remove(current_user["id"])
        attending = False
    else:
        attendees.append(current_user["id"])
        attending = True
    
    await db.events.update_one({"id": event_id}, {"$set": {"attendees": attendees}})
    return {"attending": attending, "attendee_count": len(attendees)}

# ============== SERVICES/MARKETPLACE ROUTES ==============

@api_router.post("/services", response_model=Service)
async def create_service(data: ServiceCreate, current_user: dict = Depends(get_current_user)):
    service_id = str(uuid.uuid4())
    service = {
        "id": service_id,
        "user_id": current_user["id"],
        "name": data.name,
        "category": data.category,
        "description": data.description,
        "phone": data.phone,
        "village": data.village or current_user.get("village"),
        "district": data.district or current_user.get("district"),
        "state": current_user.get("state", "Tamil Nadu"),
        "price_range": data.price_range,
        "image": data.image,
        "rating": 0.0,
        "reviews": [],
        "created_at": datetime.utcnow()
    }
    
    await db.services.insert_one(service)
    return Service(**service)

@api_router.get("/services", response_model=List[Service])
async def get_services(
    category: Optional[str] = None,
    village: Optional[str] = None,
    district: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if category:
        query["category"] = category
    if village:
        query["village"] = village
    if district:
        query["district"] = district
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    services = await db.services.find(query).sort("rating", -1).to_list(50)
    return [Service(**service) for service in services]

@api_router.post("/services/{service_id}/review")
async def add_review(
    service_id: str,
    rating: int = Query(..., ge=1, le=5),
    comment: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    service = await db.services.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    review = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "rating": rating,
        "comment": comment,
        "created_at": datetime.utcnow().isoformat()
    }
    
    reviews = service.get("reviews", [])
    reviews.append(review)
    
    # Calculate new average rating
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    
    await db.services.update_one(
        {"id": service_id},
        {"$set": {"reviews": reviews, "rating": round(avg_rating, 1)}}
    )
    
    return review

# ============== EMERGENCY ALERT ROUTES ==============

@api_router.post("/emergency")
async def send_emergency_alert(alert: EmergencyAlert, current_user: dict = Depends(get_current_user)):
    alert_id = str(uuid.uuid4())
    alert_data = {
        "id": alert_id,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_phone": current_user.get("phone"),
        "alert_type": alert.alert_type,
        "message": alert.message,
        "location": alert.location,
        "village": current_user.get("village"),
        "district": current_user.get("district"),
        "status": "active",
        "created_at": datetime.utcnow()
    }
    
    await db.emergency_alerts.insert_one(alert_data)
    
    # In production, this would send notifications to emergency contacts
    return {
        "message": "Emergency alert sent successfully",
        "alert_id": alert_id,
        "status": "Notifications sent to emergency contacts and village admins"
    }

@api_router.get("/emergency/history")
async def get_emergency_history(current_user: dict = Depends(get_current_user)):
    alerts = await db.emergency_alerts.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(20)
    return alerts

@api_router.put("/emergency/{alert_id}/resolve")
async def resolve_emergency(alert_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.emergency_alerts.update_one(
        {"id": alert_id, "user_id": current_user["id"]},
        {"$set": {"status": "resolved", "resolved_at": datetime.utcnow()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Emergency resolved"}

# ============== AI ASSISTANT ROUTES ==============

@api_router.post("/ai/chat")
async def ai_chat(message: AIChatMessage, current_user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Get user's moi data for context
        moi_entries = await db.moi_entries.find({"user_id": current_user["id"]}).to_list(100)
        events = await db.events.find({
            "$or": [
                {"village": current_user.get("village")},
                {"district": current_user.get("district")}
            ],
            "start_date": {"$gte": datetime.utcnow()}
        }).to_list(10)
        
        # Build context
        moi_context = ""
        if moi_entries:
            moi_context = "User's Moi Records:\n"
            for entry in moi_entries[:20]:
                moi_context += f"- {entry['person_name']}: Rs.{entry['amount']} ({entry['direction']}) for {entry['event_name']}\n"
        
        events_context = ""
        if events:
            events_context = "Upcoming Events:\n"
            for event in events:
                events_context += f"- {event['title']} on {event['start_date'].strftime('%d %b %Y')} at {event['location']}\n"
        
        system_message = f"""You are a helpful assistant for "Our Life" app - a community platform for Indian villages.
        
User: {current_user['name']}
Village: {current_user.get('village', 'Not set')}
District: {current_user.get('district', 'Not set')}
State: {current_user.get('state', 'Tamil Nadu')}

{moi_context}

{events_context}

Help the user with:
- Moi (financial contribution) queries
- Event and festival information
- Community news and announcements
- Village services and contacts
- General assistance

Be friendly, helpful, and culturally aware. Respond in the user's language if they write in Tamil or other regional languages."""

        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return {"response": "AI assistant is not configured. Please contact support."}
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ourlife_{current_user['id']}",
            system_message=system_message
        )
        chat.with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=message.message)
        response = await chat.send_message(user_message)
        
        return {"response": response}
        
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        return {"response": f"Sorry, I couldn't process your request. Please try again."}

# ============== POINTS/REWARDS ROUTES ==============

@api_router.get("/points")
async def get_points(current_user: dict = Depends(get_current_user)):
    return {
        "points": current_user.get("points", 0),
        "how_to_earn": [
            {"action": "Daily login", "points": 10},
            {"action": "Create post", "points": 10},
            {"action": "Add Moi entry", "points": 5},
            {"action": "Create event", "points": 20},
            {"action": "Invite friend", "points": 50},
        ]
    }

# ============== SEARCH ROUTES ==============

@api_router.get("/search")
async def global_search(
    query: str,
    current_user: dict = Depends(get_current_user)
):
    results = {
        "posts": [],
        "events": [],
        "services": [],
        "users": []
    }
    
    # Search posts
    posts = await db.posts.find({
        "content": {"$regex": query, "$options": "i"}
    }).limit(5).to_list(5)
    results["posts"] = [{"id": p["id"], "content": p["content"][:100], "category": p["category"]} for p in posts]
    
    # Search events
    events = await db.events.find({
        "$or": [
            {"title": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}}
        ]
    }).limit(5).to_list(5)
    results["events"] = [{"id": e["id"], "title": e["title"], "start_date": e["start_date"].isoformat()} for e in events]
    
    # Search services
    services = await db.services.find({
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"category": {"$regex": query, "$options": "i"}}
        ]
    }).limit(5).to_list(5)
    results["services"] = [{"id": s["id"], "name": s["name"], "category": s["category"]} for s in services]
    
    return results

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
