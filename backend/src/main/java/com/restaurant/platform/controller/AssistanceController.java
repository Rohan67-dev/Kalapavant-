package com.restaurant.platform.controller;

import com.restaurant.platform.model.AssistanceRequest;
import com.restaurant.platform.model.AssistanceType;
import com.restaurant.platform.service.AssistanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assistance")
@CrossOrigin(origins = "*")
public class AssistanceController {

    private final AssistanceService assistanceService;

    public AssistanceController(AssistanceService assistanceService) {
        this.assistanceService = assistanceService;
    }

    @PostMapping
    public ResponseEntity<?> createRequest(@RequestBody Map<String, String> request) {
        String tableNumStr = request.get("tableNumber");
        String typeStr = request.get("type");

        if (tableNumStr == null || typeStr == null) {
            return ResponseEntity.badRequest().body("tableNumber and type are required");
        }

        try {
            int tableNumber = Integer.parseInt(tableNumStr);
            AssistanceType type = AssistanceType.valueOf(typeStr.toUpperCase());
            AssistanceRequest assistanceRequest = assistanceService.createRequest(tableNumber, type);
            return ResponseEntity.ok(assistanceRequest);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body("Invalid table number format");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid request type: " + typeStr);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/active")
    public List<AssistanceRequest> getActiveRequests() {
        return assistanceService.getActiveRequests();
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<?> resolveRequest(@PathVariable Long id) {
        try {
            AssistanceRequest request = assistanceService.resolveRequest(id);
            return ResponseEntity.ok(request);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
