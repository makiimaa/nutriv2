# be-py/common/db.py
from pymongo import MongoClient
from pymongo.errors import ConfigurationError
from .config import MONGODB_URI

client = MongoClient(MONGODB_URI)

try:
    db = client.get_default_database()   
except ConfigurationError:
    db = client["nuv2"]                

# Short-hands collections
students     = db["students"]
measurements = db["physical_measurements"]
intakes      = db["daily_food_intake"]
health       = db["daily_health_status"]
nutri_recs   = db["nutritional_recommendations"]
food_items   = db["food_items"]
classes      = db["classes"]  
