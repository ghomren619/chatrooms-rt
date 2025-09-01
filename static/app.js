(function () {
  const els = {
    username: null,
    roomsList: null,
    createRoomInput: null,
    createRoomBtn: null,
    currentRoomLabel: null,
    messages: null,
    messageForm: null,
    messageInput: null,
    usersList: null,
    disconnectBtn: null
  };

  const state = {
    ws: null,
    username: "",
    room: "",
    connected: false
  };

  function $(id) { return document.getElementById(id); }

  function wsUrl(room, username) {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return proto + "://" + location.host + "/ws/" + encodeURIComponent(room) + "?username=" + encodeURIComponent(username);
  }

  function setConnected(room) {
    state.connected = true;
    state.room = room;
    els.currentRoomLabel.textContent = room;
    els.messages.innerHTML = "";
    els.usersList.innerHTML = "";
    els.messageInput.value = "";
    els.messageInput.disabled = false;
    els.messageForm.querySelector('button').disabled = false;
    els.disconnectBtn.disabled = false;
    els.messageInput.focus();
  }

  function setDisconnected() {
    state.connected = false;
    state.room = "";
    if (state.ws) { try { state.ws.close(); } catch (e) {} }
    state.ws = null;
    els.currentRoomLabel.textContent = "(not connected)";
    els.usersList.innerHTML = "";
    els.messageInput.disabled = true;
    els.messageForm.querySelector('button').disabled = true;
    els.disconnectBtn.disabled = true;
  }

  function renderRooms(rooms) {
    els.roomsList.innerHTML = "";
    rooms.forEach(r => {
      const li = document.createElement("li");
      li.textContent = r;
      if (r === state.room) li.classList.add("active");
      li.addEventListener("click", () => joinRoom(r));
      els.roomsList.appendChild(li);
    });
  }

  async function refreshRooms() {
    try {
      const res = await fetch("/rooms");
      const data = await res.json();
      renderRooms(data.rooms || []);
    } catch (e) {
      console.error("Failed to load rooms", e);
    }
  }

  async function createRoom() {
    const room = (els.createRoomInput.value || "").trim();
    if (!room) return;
    try {
      const res = await fetch("/rooms/" + encodeURIComponent(room), { method: "POST" });
      if (res.ok) {
        els.createRoomInput.value = "";
        await refreshRooms();
        await joinRoom(room);
      } else {
        const data = await res.json().catch(() => ({}));
        alert("Could not create room: " + (data.detail || res.status));
      }
    } catch (e) {
      alert("Network error creating room");
    }
  }

  function joinRoom(room) {
    const username = (els.username.value || "").trim();
    if (!username) {
      alert("Enter a username first.");
      els.username.focus();
      return;
    }
    if (state.ws) {
      try { state.ws.close(1000, "Switching room"); } catch (e) {}
      state.ws = null;
    }
    const url = wsUrl(room, username);
    const ws = new WebSocket(url);
    state.ws = ws;
    state.username = username;

    ws.onopen = () => setConnected(room);

    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.type === "users") {
        els.usersList.innerHTML = "";
        (msg.users || []).forEach(u => {
          const li = document.createElement("li");
          li.textContent = u;
          els.usersList.appendChild(li);
        });
      } else if (msg.type === "system") {
        const div = document.createElement("div");
        div.className = "msg system";
        const time = new Date(msg.timestamp).toLocaleTimeString();
        div.textContent = "[" + time + "] " + (msg.content || "");
        els.messages.appendChild(div);
        els.messages.scrollTop = els.messages.scrollHeight;
      } else if (msg.type === "message") {
        const div = document.createElement("div");
        div.className = "msg";
        const who = msg.username || "Anon";
        const time = new Date(msg.timestamp).toLocaleTimeString();
        div.textContent = "[" + time + "] " + who + ": " + (msg.content || "");
        els.messages.appendChild(div);
        els.messages.scrollTop = els.messages.scrollHeight;
      }
    };

    ws.onclose = () => {
      setDisconnected();
      refreshRooms();
    };

    ws.onerror = () => {
      // Let onclose handle UI
    };
  }

  function sendMessage(ev) {
    ev.preventDefault();
    if (!state.ws || state.ws.readyState !== 1) return;
    const text = (els.messageInput.value || "").trim();
    if (!text) return;
    const payload = JSON.stringify({ type: "message", content: text });
    state.ws.send(payload);
    els.messageInput.value = "";
  }

  function disconnect() {
    setDisconnected();
  }

  function init() {
    els.username = $("usernameInput");
    els.roomsList = $("roomsList");
    els.createRoomInput = $("createRoomInput");
    els.createRoomBtn = $("createRoomBtn");
    els.currentRoomLabel = $("currentRoomLabel");
    els.messages = $("messages");
    els.messageForm = $("messageForm");
    els.messageInput = $("messageInput");
    els.usersList = $("usersList");
    els.disconnectBtn = $("disconnectBtn");

    els.createRoomBtn.addEventListener("click", createRoom);
    els.messageForm.addEventListener("submit", sendMessage);
    els.disconnectBtn.addEventListener("click", disconnect);

    // Allow creating room by pressing Enter
    els.createRoomInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") createRoom();
    });

    refreshRooms();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
