package com.restaurant.platform.controller;

import com.restaurant.platform.model.Reservation;
import com.restaurant.platform.service.ReservationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reservations")
@CrossOrigin(origins = "*")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @PostMapping
    public ResponseEntity<?> createReservation(@RequestBody Map<String, String> request) {
        String tableNumStr = request.get("tableNumber");
        String name = request.get("customerName");
        String mobile = request.get("customerMobile");
        String timeStr = request.get("time"); // Expected ISO offset or yyyy-MM-dd HH:mm

        if (tableNumStr == null || name == null || mobile == null || timeStr == null) {
            return ResponseEntity.badRequest().body("tableNumber, customerName, customerMobile, and time are required");
        }

        try {
            int tableNumber = Integer.parseInt(tableNumStr);
            
            // Flexibly parse time (e.g. "2026-06-02 18:00")
            LocalDateTime time;
            try {
                time = LocalDateTime.parse(timeStr, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
            } catch (Exception e) {
                // Try standard ISO
                time = LocalDateTime.parse(timeStr);
            }
            
            Reservation res = reservationService.createReservation(tableNumber, name, mobile, time);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public List<Reservation> getAllReservations() {
        return reservationService.getAllReservations();
    }

    @GetMapping("/pending")
    public List<Reservation> getPendingReservations() {
        return reservationService.getPendingReservations();
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<?> confirmReservation(@PathVariable Long id) {
        try {
            Reservation res = reservationService.confirmReservation(id);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelReservation(@PathVariable Long id) {
        try {
            Reservation res = reservationService.cancelReservation(id);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
