package com.restaurant.platform.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Service
@Slf4j
public class AiClientService {

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String AI_SERVICE_URL = "http://localhost:5000/api/ai";

    @SuppressWarnings("unchecked")
    public Map<String, Object> predictIngredients(List<Map<String, Object>> orders, String time, String day) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("orders", orders);
            request.put("time", time);
            request.put("day", day);

            return restTemplate.postForObject(AI_SERVICE_URL + "/predict-ingredients", request, Map.class);
        } catch (Exception e) {
            log.warn("AI service not reachable for ingredient prediction. Using local fallback. Error: {}", e.getMessage());
            return getFallbackIngredients(orders);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> predictRushHour(String day, String time) {
        try {
            String url = String.format("%s/rush-hour?day=%s&time=%s", AI_SERVICE_URL, day, time);
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            log.warn("AI service not reachable for rush hour forecasting. Using local fallback. Error: {}", e.getMessage());
            return getFallbackRushHour(day, time);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> estimateCompletionTime(int activeItemsCount, int rotiItemsCount, boolean isPriority) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("activeItemsCount", activeItemsCount);
            request.put("rotiItemsCount", rotiItemsCount);
            request.put("isPriority", isPriority);

            return restTemplate.postForObject(AI_SERVICE_URL + "/completion-time", request, Map.class);
        } catch (Exception e) {
            log.warn("AI service not reachable for completion time estimation. Using local fallback. Error: {}", e.getMessage());
            return getFallbackCompletionTime(activeItemsCount, rotiItemsCount, isPriority);
        }
    }

    private Map<String, Object> getFallbackIngredients(List<Map<String, Object>> orders) {
        Map<String, Object> response = new HashMap<>();
        List<String> suggestions = new ArrayList<>();
        Map<String, Double> predictions = new HashMap<>();
        predictions.put("paneer", 0.0);
        predictions.put("onion", 0.0);
        predictions.put("tomato", 0.0);
        predictions.put("dough", 0.0);

        for (Map<String, Object> order : orders) {
            String name = ((String) order.getOrDefault("name", "")).toLowerCase();
            int qty = ((Number) order.getOrDefault("quantity", 0)).intValue();

            if (name.contains("tikka") || name.contains("butter paneer") || name.contains("kadai paneer")) {
                predictions.put("paneer", predictions.get("paneer") + (0.15 * qty));
                predictions.put("onion", predictions.get("onion") + (0.1 * qty));
                predictions.put("tomato", predictions.get("tomato") + (0.1 * qty));
            } else if (name.contains("roti") || name.contains("naan")) {
                predictions.put("dough", predictions.get("dough") + (0.07 * qty));
            }
        }

        // Apply fallback multiplier
        for (Map.Entry<String, Double> entry : predictions.entrySet()) {
            double kg = Math.round(entry.getValue() * 1.5 * 100.0) / 100.0;
            predictions.put(entry.getKey(), kg);
            if (kg > 0) {
                if (entry.getKey().equals("paneer")) suggestions.add("Prepare " + kg + "kg paneer cubes (Fallback)");
                else if (entry.getKey().equals("onion")) suggestions.add("Prepare " + kg + "kg chopped onions (Fallback)");
                else if (entry.getKey().equals("tomato")) suggestions.add("Prepare " + kg + "kg tomato puree (Fallback)");
                else if (entry.getKey().equals("dough")) suggestions.add("Prepare " + kg + "kg dough (Fallback)");
            }
        }

        response.put("predictions", predictions);
        response.put("suggestions", suggestions);
        response.put("fallback", true);
        return response;
    }

    private Map<String, Object> getFallbackRushHour(String day, String time) {
        Map<String, Object> response = new HashMap<>();
        response.put("day", day);
        response.put("time", time);
        response.put("rushLevel", "Medium (Fallback)");
        response.put("forecastMessage", "Local forecast. Steady demand expected.");
        response.put("recommendations", Arrays.asList("Pre-chop onions", "Knead extra dough"));
        response.put("fallback", true);
        return response;
    }

    private Map<String, Object> getFallbackCompletionTime(int activeItemsCount, int rotiItemsCount, boolean isPriority) {
        double prepTime = Math.max(10 + activeItemsCount * 1.5, 4 + rotiItemsCount * 0.5);
        if (isPriority) {
            prepTime = Math.max(prepTime * 0.6, 5.0);
        }
        double deliveryTime = prepTime + 3.0;

        Map<String, Object> response = new HashMap<>();
        response.put("estimatedCookingMinutes", Math.round(prepTime * 10.0) / 10.0);
        response.put("estimatedDeliveryMinutes", Math.round(deliveryTime * 10.0) / 10.0);
        response.put("fallback", true);
        return response;
    }
}
