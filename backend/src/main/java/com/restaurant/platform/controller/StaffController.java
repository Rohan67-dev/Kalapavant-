package com.restaurant.platform.controller;

import com.restaurant.platform.model.StaffMember;
import com.restaurant.platform.service.StaffMemberService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/staff")
@CrossOrigin(origins = "*")
public class StaffController {

    private final StaffMemberService staffService;

    public StaffController(StaffMemberService staffService) {
        this.staffService = staffService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String mobile = request.get("mobileNumber");
        String password = request.get("password");

        if (mobile == null || password == null) {
            return ResponseEntity.badRequest().body("Mobile number and password are required.");
        }

        try {
            StaffMember staff = staffService.authenticateStaff(mobile, password);
            return ResponseEntity.ok(staff);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String mobile = request.get("mobileNumber");
        String password = request.get("password");
        String role = request.get("role");

        if (name == null || mobile == null || password == null || role == null) {
            return ResponseEntity.badRequest().body("Name, mobile number, password, and role are required.");
        }

        try {
            StaffMember staff = staffService.createStaffMember(name, mobile, password, role);
            return ResponseEntity.ok(staff);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<StaffMember>> getAllStaff() {
        return ResponseEntity.ok(staffService.getAllStaff());
    }
}
