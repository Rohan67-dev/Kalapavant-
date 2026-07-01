package com.restaurant.platform.controller;

import com.restaurant.platform.model.Customer;
import com.restaurant.platform.service.CustomerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = "*")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String mobile = request.get("mobileNumber");
        String password = request.get("password");

        if (mobile == null || password == null) {
            return ResponseEntity.badRequest().body("Mobile number and password are required");
        }

        try {
            Customer customer = customerService.authenticateCustomer(mobile, password);
            return ResponseEntity.ok(customer);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String mobile = request.get("mobileNumber");
        String password = request.get("password");
        String referrerMobile = request.get("referrerMobile");

        if (name == null || mobile == null || password == null) {
            return ResponseEntity.badRequest().body("Name, mobile number, and password are required");
        }

        try {
            Customer customer = customerService.registerCustomer(name, mobile, password, referrerMobile);
            return ResponseEntity.ok(customer);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{mobile}")
    public ResponseEntity<Customer> getCustomerByMobile(@PathVariable String mobile) {
        return customerService.findByMobileNumber(mobile)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
