package com.restaurant.platform.controller;

import com.restaurant.platform.model.Customer;
import com.restaurant.platform.model.RestaurantTable;
import com.restaurant.platform.model.TableStatus;
import com.restaurant.platform.model.TableSeatMember;
import com.restaurant.platform.service.CustomerService;
import com.restaurant.platform.service.TableService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tables")
@CrossOrigin(origins = "*")
public class TableController {

    private final TableService tableService;
    private final CustomerService customerService;

    public TableController(TableService tableService, CustomerService customerService) {
        this.tableService = tableService;
        this.customerService = customerService;
    }

    @GetMapping
    public List<RestaurantTable> getAllTables() {
        return tableService.getAllTables();
    }

    @GetMapping("/{number}")
    public ResponseEntity<RestaurantTable> getTableByNumber(@PathVariable int number) {
        return tableService.getTableByNumber(number)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{number}/checkin")
    public ResponseEntity<?> checkIn(@PathVariable int number, @RequestBody Map<String, String> request) {
        String name = request.get("name");
        String mobileNumber = request.get("mobileNumber");
        String referrerMobile = request.get("referrerMobile");

        if (name == null || mobileNumber == null) {
            return ResponseEntity.badRequest().body("Name and mobile number are required");
        }

        try {
            Customer customer = customerService.getOrCreateCustomer(name, mobileNumber, referrerMobile);
            RestaurantTable table = tableService.checkIn(number, customer);
            return ResponseEntity.ok(table);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{number}/reserve")
    public ResponseEntity<?> reserveTable(@PathVariable int number, @RequestBody Map<String, String> request) {
        String name = request.get("name");
        String mobileNumber = request.get("mobileNumber");

        if (name == null || mobileNumber == null) {
            return ResponseEntity.badRequest().body("Name and mobile number are required");
        }

        try {
            Customer customer = customerService.getOrCreateCustomer(name, mobileNumber, null);
            RestaurantTable table = tableService.reserveTable(number, customer);
            return ResponseEntity.ok(table);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateTableStatus(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String statusStr = request.get("status");
        if (statusStr == null) {
            return ResponseEntity.badRequest().body("Status parameter is required");
        }

        try {
            TableStatus status = TableStatus.valueOf(statusStr.toUpperCase());
            RestaurantTable table = tableService.updateTableStatus(id, status, null);
            return ResponseEntity.ok(table);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid table status: " + statusStr);
        }
    }

    // Seat-Wise Member Endpoints
    @PostMapping("/{id}/seats/{seatNumber}/assign")
    public ResponseEntity<?> assignSeatMember(@PathVariable Long id, 
                                               @PathVariable int seatNumber, 
                                               @RequestBody Map<String, String> request) {
        String name = request.get("name");
        String mobile = request.get("mobileNumber");
        
        if (name == null || mobile == null) {
            return ResponseEntity.badRequest().body("Name and mobile number are required");
        }
        
        try {
            TableSeatMember member = tableService.assignSeatMember(id, seatNumber, name, mobile);
            return ResponseEntity.ok(member);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/seats")
    public List<TableSeatMember> getSeatMembers(@PathVariable Long id) {
        return tableService.getSeatMembers(id);
    }

    // Cleaning State Lifecycle Controllers
    @PostMapping("/{id}/start-cleaning")
    public ResponseEntity<?> startCleaning(@PathVariable Long id) {
        try {
            RestaurantTable table = tableService.startCleaning(id);
            return ResponseEntity.ok(table);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/complete-cleaning")
    public ResponseEntity<?> completeCleaning(@PathVariable Long id) {
        try {
            RestaurantTable table = tableService.completeCleaning(id);
            return ResponseEntity.ok(table);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
