package com.restaurant.platform.controller;

import com.restaurant.platform.model.Customer;
import com.restaurant.platform.service.CustomerService;
import com.restaurant.platform.service.OtpService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = "*")
public class CustomerController {

    private final CustomerService customerService;
    private final OtpService otpService;

    public CustomerController(CustomerService customerService, OtpService otpService) {
        this.customerService = customerService;
        this.otpService = otpService;
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
            
            // Generate and send OTP to both email and phone
            otpService.generateAndSendOtp(customer.getEmail(), customer.getMobileNumber());

            Map<String, String> response = new HashMap<>();
            response.put("status", "OTP_VERIFICATION_PENDING");
            response.put("message", "OTP sent to your registered email and phone number");
            response.put("email", customer.getEmail());
            response.put("mobileNumber", customer.getMobileNumber());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String mobile = request.get("mobileNumber");
        String email = request.get("email");
        String password = request.get("password");
        String referrerMobile = request.get("referrerMobile");

        if (name == null || mobile == null || email == null || password == null) {
            return ResponseEntity.badRequest().body("Name, mobile number, email, and password are required");
        }

        try {
            com.restaurant.platform.util.ValidationUtils.validateName(name);
            com.restaurant.platform.util.ValidationUtils.validateMobile(mobile);
            if (referrerMobile != null && !referrerMobile.isEmpty()) {
                com.restaurant.platform.util.ValidationUtils.validateMobile(referrerMobile);
            }
            
            // Check if user already exists with this mobile number
            if (customerService.findByMobileNumber(mobile).isPresent()) {
                return ResponseEntity.badRequest().body("Customer already registered with this mobile number. Please log in instead.");
            }
            
            // Check if user already exists with this email
            if (customerService.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body("Customer already registered with this email address. Please log in instead.");
            }

            // Generate and send OTP
            otpService.generateAndSendOtp(email, mobile);

            Map<String, String> response = new HashMap<>();
            response.put("status", "OTP_VERIFICATION_PENDING");
            response.put("message", "OTP sent to your email and phone number");
            response.put("email", email);
            response.put("mobileNumber", mobile);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String type = request.get("type"); // "login" or "register"
        String otpCode = request.get("otpCode");
        String mobile = request.get("mobileNumber");
        String email = request.get("email");

        if (otpCode == null || mobile == null) {
            return ResponseEntity.badRequest().body("OTP code and mobile number are required");
        }

        // Verify the OTP
        boolean isValid = otpService.verifyOtp(mobile, otpCode);
        if (!isValid) {
            return ResponseEntity.badRequest().body("Invalid or expired OTP. Please try again.");
        }

        try {
            if ("register".equalsIgnoreCase(type)) {
                String name = request.get("name");
                String password = request.get("password");
                String referrerMobile = request.get("referrerMobile");
                
                Customer customer = customerService.registerCustomer(name, mobile, email, password, referrerMobile);
                return ResponseEntity.ok(customer);
            } else {
                // Login
                Customer customer = customerService.findByMobileNumber(mobile)
                        .orElseThrow(() -> new RuntimeException("Customer not found"));
                return ResponseEntity.ok(customer);
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> request) {
        String mobile = request.get("mobileNumber");
        String email = request.get("email");

        if (mobile == null || email == null) {
            return ResponseEntity.badRequest().body("Mobile number and email are required");
        }

        try {
            otpService.generateAndSendOtp(email, mobile);
            Map<String, String> response = new HashMap<>();
            response.put("status", "SUCCESS");
            response.put("message", "New OTP sent successfully");
            return ResponseEntity.ok(response);
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
