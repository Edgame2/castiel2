#!/usr/bin/env python3
"""Simple test for AI models endpoint"""

import requests
import json
import sys

API_URL = "http://localhost:3001"
EMAIL = "admin@admin.com"
PASSWORD = "Morpheus@12"

def main():
    print("🔐 Logging in...")
    try:
        login_response = requests.post(
            f"{API_URL}/api/v1/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
            timeout=5
        )
        login_response.raise_for_status()
        token = login_response.json().get("accessToken")
        
        if not token:
            print("❌ Login failed - no token received")
            print(f"Response: {login_response.text}")
            return 1
            
        print(f"✅ Login successful!")
        print(f"Token: {token[:50]}...")
        print()
        
        print("📋 Testing GET /api/v1/admin/ai/models...")
        models_response = requests.get(
            f"{API_URL}/api/v1/admin/ai/models",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5
        )
        
        print(f"Status Code: {models_response.status_code}")
        print(f"Response:")
        print(json.dumps(models_response.json(), indent=2))
        print()
        
        if models_response.status_code == 200:
            data = models_response.json()
            if "models" in data:
                print(f"✅ Request successful! Found {len(data['models'])} models")
                return 0
            else:
                print("⚠️  Unexpected response format")
                return 1
        else:
            print("❌ Request failed")
            return 1
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out - is the API server running?")
        return 1
    except requests.exceptions.ConnectionError:
        print("❌ Connection error - is the API server running on port 3001?")
        return 1
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
