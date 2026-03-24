import json
import paho.mqtt.client as mqtt
import os
from datetime import datetime
from typing import Dict
import asyncio
from core.config import LOCAL_MQTT_BROKER

hardware_detection_requests: Dict[str, asyncio.Future] = {}

CLOUD_BROKER = "broker.hivemq.com"
CLOUD_PORT = 1883
LOCAL_BROKER = LOCAL_MQTT_BROKER
LOCAL_PORT = 1883

FARM_TOPIC_PREFIX = "agrisenseai/farms"
DEMO_TOPIC = "agrisenseai/demo/sensor_data"

manager = None
current_broker = "cloud"

def on_connect(client, userdata, flags, rc):
    broker_type = "Cloud" if current_broker == "cloud" else "Local"
    print(f"Connected to {broker_type} MQTT broker with result code {rc}")

    client.subscribe(DEMO_TOPIC)
    client.subscribe(f"{FARM_TOPIC_PREFIX}/+/sensor_data")  
    print(f"Subscribed to farm topics: {FARM_TOPIC_PREFIX}/+/sensor_data")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        print(f"MQTT Message from {msg.topic}: {payload}")
        
        # Extract farm_id from topic
        topic_parts = msg.topic.split('/')
        farm_id = 'demo'
        
        if len(topic_parts) >= 3 and topic_parts[1] == "farms":
            farm_id = topic_parts[2]

        payload['farm_id'] = farm_id
        payload['source'] = 'farm_sensor' if farm_id != 'demo' else 'demo_sensor'
        payload['timestamp'] = datetime.now().isoformat()
        payload['broker_type'] = current_broker
        
        if farm_id in hardware_detection_requests and not hardware_detection_requests[farm_id].done():
            print(f"🎯 Hardware detected for farm: {farm_id}")
            hardware_detection_requests[farm_id].set_result({
                "status": "connected",
                "farm_id": farm_id,
                "sensors_detected": len([k for k in payload.keys() if k in ['soil_moisture', 'temperature', 'air_humidity']]),
                "first_data": payload
            })

            del hardware_detection_requests[farm_id]

        if manager:
            import asyncio
            asyncio.run(manager.broadcast_to_farm(payload, farm_id))
            
    except Exception as e:
        print(f"MQTT message error: {e}")

def start_mqtt(websocket_manager, broker_type="cloud"):
    global manager, current_broker
    manager = websocket_manager
    current_broker = broker_type
    
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    
    if broker_type == "cloud":
        broker_url = CLOUD_BROKER
        broker_port = CLOUD_PORT
    else:   
        broker_url = LOCAL_BROKER  
        broker_port = LOCAL_PORT
    
    try:
        print(f"🔌 Connecting to {broker_type} broker: {broker_url}:{broker_port}")
        client.connect(broker_url, broker_port, 60)
        client.loop_start()
        return client
    except Exception as e:
        print(f"Failed to connect to {broker_type} broker: {e}")
        return None

# HARDWARE DETECTION FUNCTION
async def wait_for_hardware_detection(farm_id: str, timeout: int = 10):
    """
    Wait for hardware data from a specific farm
    """
    if farm_id not in hardware_detection_requests:
        detection_future = asyncio.Future()
        hardware_detection_requests[farm_id] = detection_future
    else:
        detection_future = hardware_detection_requests[farm_id]
    
    try:
        result = await asyncio.wait_for(detection_future, timeout=timeout)
        return result
    except asyncio.TimeoutError:
        if farm_id in hardware_detection_requests:
            del hardware_detection_requests[farm_id]
        return {
            "status": "timeout", 
            "farm_id": farm_id,
            "message": "No hardware detected within timeout period"
        }

