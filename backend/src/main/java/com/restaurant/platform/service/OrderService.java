package com.restaurant.platform.service;

import com.restaurant.platform.model.*;
import com.restaurant.platform.repository.OrderRepository;
import com.restaurant.platform.repository.RestaurantTableRepository;
import com.restaurant.platform.repository.MenuItemRepository;
import com.restaurant.platform.repository.OrderItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final RestaurantTableRepository tableRepository;
    private final MenuItemRepository menuItemRepository;
    private final AiClientService aiClientService;
    private final WebSocketService webSocketService;

    public OrderService(OrderRepository orderRepository,
                        OrderItemRepository orderItemRepository,
                        RestaurantTableRepository tableRepository,
                        MenuItemRepository menuItemRepository,
                        AiClientService aiClientService, 
                        WebSocketService webSocketService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.tableRepository = tableRepository;
        this.menuItemRepository = menuItemRepository;
        this.aiClientService = aiClientService;
        this.webSocketService = webSocketService;
    }

    public Order createOrder(Long tableId, Long customerId, List<OrderItem> items, boolean isPriority) {
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new IllegalArgumentException("Table not found: " + tableId));
        
        Customer customer = table.getCurrentCustomer();
        if (customer == null || !customer.getId().equals(customerId)) {
            throw new IllegalStateException("Table must have checking-in customer matches to place order");
        }

        // Calculate current active cooking queue
        int activeSabjiCount = 0;
        int activeRotiCount = 0;
        
        List<Order> activeOrders = orderRepository.findByStatusIn(Arrays.asList(
                OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARATION_STARTED, OrderStatus.COOKING
        ));
        
        for (Order activeOrder : activeOrders) {
            for (OrderItem item : activeOrder.getItems()) {
                if (item.getStatus() != ItemStatus.READY) {
                    if (item.getMenuItem().getCategory() == MenuCategory.SABJI) {
                        activeSabjiCount += item.getQuantity();
                    } else if (item.getMenuItem().getCategory() == MenuCategory.ROTI) {
                        activeRotiCount += item.getQuantity();
                    }
                }
            }
        }

        // Add the new order's items to count
        for (OrderItem item : items) {
            if (item.getMenuItem().getCategory() == MenuCategory.SABJI) {
                activeSabjiCount += item.getQuantity();
            } else if (item.getMenuItem().getCategory() == MenuCategory.ROTI) {
                activeRotiCount += item.getQuantity();
            }
        }

        // Retrieve AI Completion Time Estimates
        Map<String, Object> aiEstimates = aiClientService.estimateCompletionTime(
                activeSabjiCount, activeRotiCount, isPriority
        );
        
        double estimatedCooking = ((Number) aiEstimates.getOrDefault("estimatedCookingMinutes", 15.0)).doubleValue();
        double estimatedDelivery = ((Number) aiEstimates.getOrDefault("estimatedDeliveryMinutes", 18.0)).doubleValue();

        Order order = Order.builder()
                .table(table)
                .customer(customer)
                .status(OrderStatus.PENDING)
                .isPriority(isPriority)
                .estimatedPrepMinutes(estimatedCooking)
                .estimatedDeliveryMinutes(estimatedDelivery)
                .orderTime(LocalDateTime.now())
                .build();

        for (OrderItem item : items) {
            order.addItem(item);
        }

        Order saved = orderRepository.save(order);
        
        // Mark table occupied if it wasn't
        if (table.getStatus() == TableStatus.AVAILABLE || table.getStatus() == TableStatus.RESERVED) {
            table.setStatus(TableStatus.OCCUPIED);
            tableRepository.save(table);
            webSocketService.sendUpdate("TABLE_UPDATE", table);
        }

        webSocketService.sendUpdate("ORDER_CREATED", saved);
        return saved;
    }

    public Order updateOrderStatus(Long orderId, OrderStatus status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        
        order.setStatus(status);
        if (status == OrderStatus.READY) {
            order.setCompletionTime(LocalDateTime.now());
            // Sync all active items to ready
            for (OrderItem item : order.getItems()) {
                item.setStatus(ItemStatus.READY);
            }
            webSocketService.sendUpdate("FOOD_READY", order);
        } else if (status == OrderStatus.DELIVERED) {
            webSocketService.sendUpdate("FOOD_DELIVERED", order);
        } else if (status == OrderStatus.PREPARATION_STARTED) {
            for (OrderItem item : order.getItems()) {
                item.setStatus(ItemStatus.IN_PROGRESS);
            }
        }

        Order saved = orderRepository.save(order);
        webSocketService.sendUpdate("ORDER_UPDATE", saved);
        return saved;
    }

    public Order updateOrderItemStatus(Long itemId, ItemStatus status) {
        OrderItem targetItem = orderItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Order item not found with id: " + itemId));

        targetItem.setStatus(status);
        Order targetOrder = targetItem.getOrder();
        
        // Auto progress order status based on item statuses
        boolean allReady = true;
        boolean anyInProgress = false;
        
        for (OrderItem item : targetOrder.getItems()) {
            if (item.getStatus() != ItemStatus.READY) {
                allReady = false;
            }
            if (item.getStatus() == ItemStatus.IN_PROGRESS) {
                anyInProgress = true;
            }
        }

        if (allReady) {
            targetOrder.setStatus(OrderStatus.READY);
            targetOrder.setCompletionTime(LocalDateTime.now());
            webSocketService.sendUpdate("FOOD_READY", targetOrder);
        } else if (anyInProgress && (targetOrder.getStatus() == OrderStatus.ACCEPTED || targetOrder.getStatus() == OrderStatus.PENDING)) {
            targetOrder.setStatus(OrderStatus.PREPARATION_STARTED);
        }

        orderRepository.save(targetOrder);
        webSocketService.sendUpdate("ORDER_UPDATE", targetOrder);
        return targetOrder;
    }

    // True SROS Item-Level Cancellations
    public void cancelOrderItem(Long itemId, boolean byCustomer) {
        OrderItem item = orderItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Order item not found: " + itemId));

        // Check locks: if started preparing or cooking (IN_PROGRESS or READY)
        if (byCustomer && (item.getStatus() == ItemStatus.IN_PROGRESS || item.getStatus() == ItemStatus.READY)) {
            throw new IllegalStateException("Cancellation blocked: Kitchen has already started preparing this item (" + item.getMenuItem().getName() + ").");
        }

        Order order = item.getOrder();
        order.getItems().remove(item);
        orderItemRepository.delete(item);

        if (order.getItems().isEmpty()) {
            // Delete entire order if empty
            orderRepository.delete(order);
            webSocketService.sendUpdate("ORDER_CANCELLED", order.getId());
        } else {
            // Re-calculate order status if some items remain
            boolean anyInProgress = false;
            boolean allReady = true;
            for (OrderItem oItem : order.getItems()) {
                if (oItem.getStatus() != ItemStatus.READY) allReady = false;
                if (oItem.getStatus() == ItemStatus.IN_PROGRESS) anyInProgress = true;
            }
            
            if (allReady) {
                order.setStatus(OrderStatus.READY);
                order.setCompletionTime(LocalDateTime.now());
            } else if (anyInProgress && order.getStatus() == OrderStatus.ACCEPTED) {
                order.setStatus(OrderStatus.PREPARATION_STARTED);
            }
            
            Order saved = orderRepository.save(order);
            webSocketService.sendUpdate("ORDER_UPDATE", saved);
        }
    }

    // Cancel entire order
    public void cancelOrder(Long orderId, boolean byCustomer) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        
        // If cancellation is triggered by customer, verify if any items have started prep
        if (byCustomer) {
            for (OrderItem item : order.getItems()) {
                if (item.getStatus() == ItemStatus.IN_PROGRESS || item.getStatus() == ItemStatus.READY) {
                    throw new IllegalStateException("Cancellation blocked: Kitchen has already started preparation for items in this order.");
                }
            }
        }
        
        orderRepository.delete(order);
        webSocketService.sendUpdate("ORDER_CANCELLED", orderId);
    }

    public Order modifyOrder(Long orderId, List<OrderItem> newItems, boolean byCustomer) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (byCustomer) {
            for (OrderItem item : order.getItems()) {
                if (item.getStatus() == ItemStatus.IN_PROGRESS || item.getStatus() == ItemStatus.READY) {
                    throw new IllegalStateException("Modification blocked: Kitchen has already started preparation for items in this order.");
                }
            }
        }

        // Clear existing items and load new ones
        order.getItems().clear();
        for (OrderItem item : newItems) {
            order.addItem(item);
        }

        Order saved = orderRepository.save(order);
        webSocketService.sendUpdate("ORDER_UPDATE", saved);
        return saved;
    }

    public Order addComplimentaryItem(Long orderId, Long menuItemId, int quantity) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        MenuItem menuItem = menuItemRepository.findById(menuItemId)
                .orElseThrow(() -> new IllegalArgumentException("Menu item not found: " + menuItemId));

        OrderItem compItem = OrderItem.builder()
                .menuItem(menuItem)
                .quantity(quantity)
                .specialInstructions("Complimentary (Waiter Added)")
                .complimentary(true)
                .status(ItemStatus.PENDING)
                .build();

        order.addItem(compItem);
        Order saved = orderRepository.save(order);
        webSocketService.sendUpdate("ORDER_UPDATE", saved);
        return saved;
    }

    public List<Order> getActiveOrders() {
        return orderRepository.findByStatusIn(Arrays.asList(
                OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARATION_STARTED, OrderStatus.COOKING, OrderStatus.READY
        ));
    }

    public List<Order> getOrdersByTable(Long tableId) {
        return orderRepository.findByTableIdAndStatusNot(tableId, OrderStatus.DELIVERED);
    }

    public List<Order> getOrdersByCustomer(Long customerId) {
        return orderRepository.findByCustomerId(customerId);
    }
}
