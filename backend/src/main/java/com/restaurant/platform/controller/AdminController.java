package com.restaurant.platform.controller;

import com.restaurant.platform.model.RestaurantTable;
import com.restaurant.platform.model.TableStatus;
import com.restaurant.platform.repository.*;
import com.restaurant.platform.service.WebSocketService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final TableSeatMemberRepository seatMemberRepository;
    private final CustomerRepository customerRepository;
    private final RestaurantTableRepository tableRepository;
    private final ReservationRepository reservationRepository;
    private final WebSocketService webSocketService;

    public AdminController(OrderRepository orderRepository,
                           OrderItemRepository orderItemRepository,
                           TableSeatMemberRepository seatMemberRepository,
                           CustomerRepository customerRepository,
                           RestaurantTableRepository tableRepository,
                           ReservationRepository reservationRepository,
                           WebSocketService webSocketService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.seatMemberRepository = seatMemberRepository;
        this.customerRepository = customerRepository;
        this.tableRepository = tableRepository;
        this.reservationRepository = reservationRepository;
        this.webSocketService = webSocketService;
    }

    @PostMapping("/reset")
    public ResponseEntity<?> resetDatabase() {
        try {
            // Delete all orders and items
            orderRepository.deleteAll();
            orderItemRepository.deleteAll();

            // Delete all seat assignments
            seatMemberRepository.deleteAll();

            // Delete all reservations
            reservationRepository.deleteAll();

            // Delete all registered customers
            customerRepository.deleteAll();

            // Reset all tables to AVAILABLE and remove currentCustomer references
            List<RestaurantTable> tables = tableRepository.findAll();
            for (RestaurantTable table : tables) {
                table.setStatus(TableStatus.AVAILABLE);
                table.setCurrentCustomer(null);
                tableRepository.save(table);
                webSocketService.sendUpdate("TABLE_UPDATE", table);
            }

            return ResponseEntity.ok(Map.of("message", "Database successfully reset. All active customer sessions, orders, and registrations have been wiped."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to reset database: " + e.getMessage());
        }
    }
}
