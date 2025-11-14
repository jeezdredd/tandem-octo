import asyncio
import websockets
import json

ROOM_ID = "9e459b15-c3d9-443a-bc75-8c4a5079a465"
WS_URL = f"ws://localhost:8000/ws/rooms/{ROOM_ID}/"


async def test_websocket():
    print(f"Connecting to {WS_URL}...")

    async with websockets.connect(WS_URL) as websocket:
        print("Connected!")

        initial_message = await websocket.recv()
        print(f"Received initial state: {initial_message}")

        print("\nSending PLAY event...")
        await websocket.send(
            json.dumps({"type": "play", "current_time": 10.5})
        )

        response = await websocket.recv()
        print(f"Received: {response}")

        print("\n⏸Sending PAUSE event...")
        await websocket.send(
            json.dumps({"type": "pause", "current_time": 15.2})
        )

        response = await websocket.recv()
        print(f"Received: {response}")

        print("\nSending SEEK event...")
        await websocket.send(
            json.dumps({"type": "seek", "current_time": 120.0, "is_playing": True})
        )

        response = await websocket.recv()
        print(f"Received: {response}")

        print("\nWebSocket test completed!")


if __name__ == "__main__":
    asyncio.run(test_websocket())
