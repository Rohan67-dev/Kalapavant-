package com.restaurant.platform.controller;

import com.restaurant.platform.model.*;
import com.restaurant.platform.repository.MenuItemRepository;
import com.restaurant.platform.service.OrderService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    private final OrderService orderService;
    private final MenuItemRepository menuItemRepository;

    public OrderController(OrderService orderService, MenuItemRepository menuItemRepository) {
        this.orderService = orderService;
        this.menuItemRepository = menuItemRepository;
    }

    @PostMapping
    public ResponseEntity<?> placeOrder(@RequestBody OrderRequest request) {
        if (request.getTableId() == null || request.getCustomerId() == null || request.getItems() == null || request.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body("Table ID, Customer ID, and Order Items are required");
        }

        try {
            List<OrderItem> orderItems = new ArrayList<>();
            for (OrderItemRequest itemReq : request.getItems()) {
                MenuItem menuItem = menuItemRepository.findById(itemReq.getMenuItemId())
                        .orElseThrow(() -> new IllegalArgumentException("Menu item not found: " + itemReq.getMenuItemId()));
                
                OrderItem item = OrderItem.builder()
                        .menuItem(menuItem)
                        .quantity(itemReq.getQuantity())
                        .specialInstructions(itemReq.getSpecialInstructions())
                        .seatNumber(itemReq.getSeatNumber() != null ? itemReq.getSeatNumber() : 1)
                        .customerName(itemReq.getCustomerName())
                        .status(ItemStatus.PENDING)
                        .build();
                orderItems.add(item);
            }

            Order order = orderService.createOrder(
                    request.getTableId(), 
                    request.getCustomerId(), 
                    orderItems, 
                    request.isPriority()
            );
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/active")
    public List<Order> getActiveOrders() {
        return orderService.getActiveOrders();
    }

    @GetMapping("/table/{tableId}")
    public List<Order> getOrdersByTable(@PathVariable Long tableId) {
        return orderService.getOrdersByTable(tableId);
    }

    @GetMapping("/customer/{customerId}")
    public List<Order> getOrdersByCustomer(@PathVariable Long customerId) {
        return orderService.getOrdersByCustomer(customerId);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String statusStr = request.get("status");
        if (statusStr == null) {
            return ResponseEntity.badRequest().body("Status is required");
        }

        try {
            OrderStatus status = OrderStatus.valueOf(statusStr.toUpperCase());
            Order order = orderService.updateOrderStatus(id, status);
            return ResponseEntity.ok(order);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid order status: " + statusStr);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/items/{itemId}/status")
    public ResponseEntity<?> updateOrderItemStatus(@PathVariable Long itemId, @RequestBody Map<String, String> request) {
        String statusStr = request.get("status");
        if (statusStr == null) {
            return ResponseEntity.badRequest().body("Status is required");
        }

        try {
            ItemStatus status = ItemStatus.valueOf(statusStr.toUpperCase());
            Order order = orderService.updateOrderItemStatus(itemId, status);
            return ResponseEntity.ok(order);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid item status: " + statusStr);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Cancel entire order
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id, @RequestParam(defaultValue = "true") boolean byCustomer) {
        try {
            orderService.cancelOrder(id, byCustomer);
            return ResponseEntity.ok().body(Map.of("message", "Order successfully cancelled"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error cancelling order: " + e.getMessage());
        }
    }

    // True SROS Item-Level Cancellations
    @PostMapping("/items/{itemId}/cancel")
    public ResponseEntity<?> cancelOrderItem(@PathVariable Long itemId, @RequestParam(defaultValue = "true") boolean byCustomer) {
        try {
            orderService.cancelOrderItem(itemId, byCustomer);
            return ResponseEntity.ok().body(Map.of("message", "Item successfully cancelled"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage()); // Returns 400 with "Cancellation blocked"
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error cancelling item: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/complimentary")
    public ResponseEntity<?> addComplimentaryItem(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        Number menuItemIdNum = (Number) request.get("menuItemId");
        Number quantityNum = (Number) request.get("quantity");

        if (menuItemIdNum == null || quantityNum == null) {
            return ResponseEntity.badRequest().body("menuItemId and quantity are required");
        }

        try {
            Order order = orderService.addComplimentaryItem(
                    id, 
                    menuItemIdNum.longValue(), 
                    quantityNum.intValue()
            );
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @Data
    public static class OrderRequest {
        private Long tableId;
        private Long customerId;
        private boolean isPriority;
        private List<OrderItemRequest> items;
    }

    @Data
    public static class OrderItemRequest {
        private Long menuItemId;
        private int quantity;
        private String specialInstructions;
        private Integer seatNumber;
        private String customerName;
    }
}
