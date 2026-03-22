from fastapi import WebSocket
from typing import Dict, Set
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[WebSocket, str] = {}   
        self.farm_subscriptions: Dict[str, Set[WebSocket]] = {}  

    async def connect(self, websocket: WebSocket, farm_id: str = "demo"):
        await websocket.accept()
        self.active_connections[websocket] = farm_id
        
        if farm_id not in self.farm_subscriptions:
            self.farm_subscriptions[farm_id] = set()
        self.farm_subscriptions[farm_id].add(websocket)
        
        print(f"WebSocket connected to farm {farm_id}. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            farm_id = self.active_connections[websocket]

            if farm_id in self.farm_subscriptions and websocket in self.farm_subscriptions[farm_id]:
                self.farm_subscriptions[farm_id].remove(websocket)
            
            del self.active_connections[websocket]
        
        print(f"WebSocket disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast_to_farm(self, message: dict, farm_id: str):
        """Send message only to connections subscribed to this farm"""
        if farm_id in self.farm_subscriptions:
            disconnected = set()
            for websocket in self.farm_subscriptions[farm_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception:
                    disconnected.add(websocket)

            for websocket in disconnected:
                self.farm_subscriptions[farm_id].remove(websocket)

    async def switch_farm(self, websocket: WebSocket, new_farm_id: str):
        """Switch a WebSocket connection to a different farm"""
        if websocket in self.active_connections:
            old_farm_id = self.active_connections[websocket]

            if old_farm_id in self.farm_subscriptions and websocket in self.farm_subscriptions[old_farm_id]:
                self.farm_subscriptions[old_farm_id].remove(websocket)

            self.active_connections[websocket] = new_farm_id
            if new_farm_id not in self.farm_subscriptions:
                self.farm_subscriptions[new_farm_id] = set()
            self.farm_subscriptions[new_farm_id].add(websocket)
            
            print(f"WebSocket switched from {old_farm_id} to {new_farm_id}")

    async def broadcast(self, message: dict):
        """Broadcast to all connected clients (backward compatibility)"""
        disconnected = []
        for websocket in self.active_connections:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception:
                disconnected.append(websocket)
        
        for websocket in disconnected:
            self.disconnect(websocket)