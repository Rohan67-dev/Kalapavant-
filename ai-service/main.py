from flask import Flask, request, jsonify
import datetime

app = Flask(__name__)

# Ingredient weights in grams per item
RECIPES = {
    "paneer tikka masala": {"paneer": 150, "onion": 100, "tomato": 80, "dough": 0},
    "kadai paneer": {"paneer": 120, "onion": 120, "tomato": 100, "dough": 0},
    "butter paneer": {"paneer": 150, "onion": 80, "tomato": 150, "dough": 0},
    "tandoori roti": {"paneer": 0, "onion": 0, "tomato": 0, "dough": 60},
    "butter roti": {"paneer": 0, "onion": 0, "tomato": 0, "dough": 60},
    "naan": {"paneer": 0, "onion": 0, "tomato": 0, "dough": 80},
    "paneer bhurji": {"paneer": 130, "onion": 150, "tomato": 100, "dough": 0},
    "veg kolhapuri": {"paneer": 50, "onion": 140, "tomato": 120, "dough": 0},
}

@app.route('/api/ai/predict-ingredients', methods=['POST'])
def predict_ingredients():
    """
    Predicts ingredient requirements based on active orders and scaling factors
    such as time of day and day of week to forecast upcoming demand.
    Input JSON format: { "orders": [ { "name": "Paneer Tikka Masala", "quantity": 10 }, ... ], "time": "20:00", "day": "Saturday" }
    """
    data = request.json or {}
    orders = data.get("orders", [])
    
    # Extract time and day, default to current local time if not provided
    now = datetime.datetime.now()
    time_str = data.get("time", now.strftime("%H:%M"))
    day_str = data.get("day", now.strftime("%A"))
    
    # Calculate base requirements
    totals = {"paneer": 0.0, "onion": 0.0, "tomato": 0.0, "dough": 0.0}
    
    for order in orders:
        name = order.get("name", "").lower().strip()
        qty = int(order.get("quantity", 0))
        
        if name in RECIPES:
            ingredients = RECIPES[name]
            for ing, grams in ingredients.items():
                totals[ing] += (grams * qty)
        else:
            # Check for partial matches
            for recipe_name, ingredients in RECIPES.items():
                if recipe_name in name:
                    for ing, grams in ingredients.items():
                        totals[ing] += (grams * qty)
                    break

    # AI Factor: Day of week multiplier (Weekend demand is higher)
    day_multiplier = 1.0
    if day_str.lower() in ["friday", "saturday", "sunday"]:
        day_multiplier = 1.4
    
    # AI Factor: Time of day multiplier (Lunch/Dinner rush vs off-peak)
    hour = int(time_str.split(":")[0]) if ":" in time_str else 12
    time_multiplier = 1.0
    if (12 <= hour <= 15) or (19 <= hour <= 22):
        time_multiplier = 1.5
    
    total_multiplier = day_multiplier * time_multiplier
    
    # Apply multipliers and convert to kilograms (rounded)
    predictions = {}
    suggestions = []
    
    for ing, grams in totals.items():
        predicted_grams = grams * total_multiplier
        kg = round(predicted_grams / 1000.0, 2)
        predictions[ing] = kg
        
        if kg > 0:
            if ing == "paneer":
                suggestions.append(f"Prepare {kg}kg paneer cubes")
            elif ing == "onion":
                suggestions.append(f"Prepare {kg}kg chopped onions")
            elif ing == "tomato":
                suggestions.append(f"Prepare {kg}kg tomato puree")
            elif ing == "dough":
                suggestions.append(f"Prepare {kg}kg dough")

    return jsonify({
        "predictions": predictions,
        "suggestions": suggestions,
        "factors": {
            "dayOfWeek": day_str,
            "timeOfDay": time_str,
            "dayMultiplier": day_multiplier,
            "timeMultiplier": time_multiplier,
            "totalMultiplier": round(total_multiplier, 2)
        }
    })

@app.route('/api/ai/rush-hour', methods=['GET'])
def predict_rush_hour():
    """
    Predicts rush hour levels and recommends pre-preparation steps.
    """
    now = datetime.datetime.now()
    day_str = request.args.get("day", now.strftime("%A"))
    time_str = request.args.get("time", now.strftime("%H:%M"))
    
    hour = int(time_str.split(":")[0]) if ":" in time_str else 12
    
    is_weekend = day_str.lower() in ["friday", "saturday", "sunday"]
    is_lunch = 12 <= hour <= 15
    is_dinner = 19 <= hour <= 22
    
    rush_level = "Low"
    message = "Expect light demand. Normal preparation schedule is fine."
    recommendations = []
    
    if is_weekend:
        if is_dinner:
            rush_level = "High (Critical)"
            message = "Weekend Dinner Rush! Extremely high traffic expected."
            recommendations = [
                "Pre-chop 5kg onions and 4kg tomatoes",
                "Pre-cut 4kg paneer cubes",
                "Knead 5kg extra wheat dough",
                "Ensure both Sabji and Roti cook stations are double staffed"
            ]
        elif is_lunch:
            rush_level = "High"
            message = "Weekend Lunch Rush! High traffic expected."
            recommendations = [
                "Pre-chop 3kg onions and 2.5kg tomatoes",
                "Knead 3kg extra wheat dough",
                "Keep base gravies warm"
            ]
        else:
            rush_level = "Medium"
            message = "Weekend off-peak hours. Mild but steady inflow."
            recommendations = [
                "Prepare base gravies for upcoming rush",
                "Ensure roti dough is ready"
            ]
    else:
        if is_dinner:
            rush_level = "Medium-High"
            message = "Weekday Dinner Rush. Steady demand expected."
            recommendations = [
                "Pre-chop 3kg onions and 2kg tomatoes",
                "Prepare 2kg paneer cubes",
                "Knead 3kg dough"
            ]
        elif is_lunch:
            rush_level = "Medium"
            message = "Weekday Lunch Rush. Corporate crowds expected."
            recommendations = [
                "Pre-chop 2kg onions",
                "Prepare base lunch gravies"
            ]
            
    return jsonify({
        "day": day_str,
        "time": time_str,
        "rushLevel": rush_level,
        "forecastMessage": message,
        "recommendations": recommendations
    })

@app.route('/api/ai/completion-time', methods=['POST'])
def estimate_completion_time():
    """
    Estimates cooking completion time and delivery time.
    Input: { "activeItemsCount": 8, "rotiItemsCount": 4, "isPriority": false }
    """
    data = request.json or {}
    sabji_count = int(data.get("activeItemsCount", 0))
    roti_count = int(data.get("rotiItemsCount", 0))
    is_priority = bool(data.get("isPriority", False))
    
    # Heuristics:
    # Sabji takes roughly 10 minutes base, plus 1 minute for each queue item.
    # Roti takes 3 minutes base, plus 0.5 minutes for each queue item.
    # If there are active items, cooking takes at least that base.
    
    sabji_time = 0
    if sabji_count > 0:
        sabji_time = 10 + (sabji_count * 1.2)
        
    roti_time = 0
    if roti_count > 0:
        roti_time = 4 + (roti_count * 0.4)
        
    estimated_cooking_time = max(sabji_time, roti_time)
    
    if estimated_cooking_time == 0:
        estimated_cooking_time = 5.0 # default standby time
        
    if is_priority:
        # Priority cuts cooking order wait time
        estimated_cooking_time = max(estimated_cooking_time * 0.6, 5.0)
        
    # Delivery time adds 2-3 minutes of waiter transit time
    delivery_time = estimated_cooking_time + 3.0
    
    return jsonify({
        "estimatedCookingMinutes": round(estimated_cooking_time, 1),
        "estimatedDeliveryMinutes": round(delivery_time, 1)
    })

if __name__ == '__main__':
    print("Starting AI service on port 5000...")
    app.run(host='0.0.0.0', port=5000)
