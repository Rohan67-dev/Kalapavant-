package com.restaurant.platform.controller;

import com.restaurant.platform.model.Order;
import com.restaurant.platform.model.OrderItem;
import com.restaurant.platform.model.ItemStatus;
import com.restaurant.platform.service.AiClientService;
import com.restaurant.platform.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AIController {

    private final AiClientService aiClientService;
    private final OrderService orderService;

    public AIController(AiClientService aiClientService, OrderService orderService) {
        this.aiClientService = aiClientService;
        this.orderService = orderService;
    }

    @GetMapping("/rush-hour")
    public ResponseEntity<?> getRushHourPrediction(
            @RequestParam(required = false) String day,
            @RequestParam(required = false) String time) {
        
        LocalDateTime now = LocalDateTime.now();
        if (day == null || day.trim().isEmpty()) {
            day = now.format(DateTimeFormatter.ofPattern("EEEE"));
        }
        if (time == null || time.trim().isEmpty()) {
            time = now.format(DateTimeFormatter.ofPattern("HH:mm"));
        }

        try {
            Map<String, Object> prediction = aiClientService.predictRushHour(day, time);
            return ResponseEntity.ok(prediction);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/prep-guidance")
    public ResponseEntity<?> getPrepGuidance(
            @RequestParam(required = false) String day,
            @RequestParam(required = false) String time) {

        LocalDateTime now = LocalDateTime.now();
        if (day == null || day.trim().isEmpty()) {
            day = now.format(DateTimeFormatter.ofPattern("EEEE"));
        }
        if (time == null || time.trim().isEmpty()) {
            time = now.format(DateTimeFormatter.ofPattern("HH:mm"));
        }

        try {
            // Aggregate all active (non-ready) items currently in queue
            List<Order> activeOrders = orderService.getActiveOrders();
            List<Map<String, Object>> ordersList = new ArrayList<>();
            
            for (Order order : activeOrders) {
                for (OrderItem item : order.getItems()) {
                    if (item.getStatus() != ItemStatus.READY) {
                        Map<String, Object> itemMap = new HashMap<>();
                        itemMap.put("name", item.getMenuItem().getName());
                        itemMap.put("quantity", item.getQuantity());
                        ordersList.add(itemMap);
                    }
                }
            }

            Map<String, Object> guidance = aiClientService.predictIngredients(ordersList, time, day);
            return ResponseEntity.ok(guidance);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
