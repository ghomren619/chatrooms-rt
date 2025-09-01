from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from typing import Dict, Set
import json
from datetime import datetime

app = FastAPI()

# CORS for development; in production restrict origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return FileResponse("static/index.html")

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Set[WebSocket]] = {}
        self.usernames: Dict[WebSocket, str] = {}
        self.user_room: Dict[WebSocket, str] = {}

    async def join(self, websocket: WebSocket, room: str, username: str, accept: bool = False):
        if accept:
            await websocket.accept()
        self.rooms.setdefault(room, set()).add(websocket)
        self.usernames[websocket] = username
        self.user_room[websocket] = room
        await self.broadcast_system(room, f"{username} joined")
        await self.broadcast_users(room)

    def leave(self, websocket: WebSocket):
        room = self.user_room.pop(websocket, None)
        username = self.usernames.pop(websocket, None)
        if room and websocket in self.rooms.get(room, set()):
            self.rooms[room].remove(websocket)
            if not self.rooms[room]:
                del self.rooms[room]
        return room, username

    async def _broadcast(self, room: str, payload: dict):
        dead = []
        for ws in list(self.rooms.get(room, set())):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            try:
                await ws.close()
            except Exception:
                pass
            self.leave(ws)

    async def broadcast_users(self, room: str):
        users = [self.usernames[w] for w in self.rooms.get(room, set())]
        await self._broadcast(room, {"type": "users", "room": room, "users": users})

    async def broadcast_system(self, room: str, content: str):
        await self._broadcast(room, {
            "type": "system",
            "room": room,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        })

    async def send_message(self, room: str, username: str, content: str):
        await self._broadcast(room, {
            "type": "message",
            "room": room,
            "username": username,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        })

manager = ConnectionManager()

@app.get("/rooms")
async def list_rooms():
    return {"rooms": sorted(manager.rooms.keys())}

@app.post("/rooms/{room}")
async def create_room(room: str):
    if room in manager.rooms:
        raise HTTPException(status_code=400, detail="Room already exists")
    manager.rooms[room] = set()
    return {"ok": True, "room": room}

@app.get("/rooms/{room}/users")
async def get_room_users(room: str):
    users = [manager.usernames[w] for w in manager.rooms.get(room, set())]
    return {"room": room, "users": users}

@app.websocket("/ws/{room}")
async def websocket_endpoint(websocket: WebSocket, room: str):
    username = websocket.query_params.get("username") or "Anonymous"
    await manager.join(websocket, room, username, accept=True)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                msg_type = data.get("type") or "message"
                if msg_type == "message":
                    content = (data.get("content") or "").strip()
                    if content:
                        await manager.send_message(room, username, content)
                else:
                    # Unknown types are ignored in this prototype
                    pass
            except json.JSONDecodeError:
                content = raw.strip()
                if content:
                    await manager.send_message(room, username, content)
    except WebSocketDisconnect:
        left_room, left_user = manager.leave(websocket)
        if left_room and left_user:
            await manager.broadcast_system(left_room, f"{left_user} left")
            await manager.broadcast_users(left_room)
