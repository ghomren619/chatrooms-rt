# Real-Time Chat Rooms 💬

A simple real-time chat application built with FastAPI (Python) backend and vanilla JavaScript frontend.

## Features

- ✅ Multiple chat rooms
- ✅ Real-time messaging with WebSockets
- ✅ Online users list per room
- ✅ Room creation and switching
- ✅ Join/leave notifications
- ✅ Clean, responsive UI

## Quick Start

### Development

1. **Activate virtual environment**:
   ```powershell
   .\.venv\Scripts\Activate
   ```

2. **Start the server**:
   ```powershell
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

3. **Open in browser**: http://localhost:8000

### Testing

1. Enter a username
2. Create a new room or join an existing one
3. Open multiple browser tabs to test real-time functionality
4. Switch between rooms to test connection management

## Project Structure

```
chatrooms-rt/
├── app/
│   ├── __init__.py
│   └── main.py          # FastAPI backend with WebSocket support
├── static/
│   ├── index.html       # Frontend HTML
│   ├── styles.css       # UI styling
│   └── app.js           # WebSocket client logic
├── requirements.txt     # Python dependencies
└── README.md
```

## Deployment

### Basic deployment command:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### For cloud platforms (Render, Fly.io, etc.):
1. Upload project files
2. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Install dependencies from `requirements.txt`

## API Endpoints

- `GET /` - Serve frontend
- `GET /rooms` - List all rooms
- `POST /rooms/{room}` - Create a new room
- `GET /rooms/{room}/users` - Get users in room
- `WebSocket /ws/{room}?username={username}` - Join room chat

## Built With

- **Backend**: FastAPI, Python 3.12, uvicorn
- **Frontend**: Vanilla HTML/CSS/JavaScript, WebSocket API
- **Real-time**: WebSocket connections for instant messaging

Built in ~30 minutes as a fun coding project! 🚀
"# chatrooms-rt" 
