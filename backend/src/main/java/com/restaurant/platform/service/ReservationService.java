package com.restaurant.platform.service;

import com.restaurant.platform.model.*;
import com.restaurant.platform.repository.ReservationRepository;
import com.restaurant.platform.repository.RestaurantTableRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final RestaurantTableRepository tableRepository;
    private final CustomerService customerService;
    private final WebSocketService webSocketService;

    public ReservationService(ReservationRepository reservationRepository,
                              RestaurantTableRepository tableRepository,
                              CustomerService customerService,
                              WebSocketService webSocketService) {
        this.reservationRepository = reservationRepository;
        this.tableRepository = tableRepository;
        this.customerService = customerService;
        this.webSocketService = webSocketService;
    }

    public Reservation createReservation(int tableNumber, String customerName, String customerMobile, LocalDateTime time) {
        RestaurantTable table = tableRepository.findByTableNumber(tableNumber)
                .orElseThrow(() -> new IllegalArgumentException("Table not found: " + tableNumber));

        if (table.getStatus() == TableStatus.CLEANING_REQUIRED ||
            table.getStatus() == TableStatus.CLEANING_IN_PROGRESS ||
            table.getStatus() == TableStatus.OUT_OF_SERVICE) {
            throw new IllegalStateException("Reservation blocked: Table is currently in cleaning or out of service.");
        }

        Customer customer = customerService.getOrCreateCustomer(customerName, customerMobile, null);

        Reservation reservation = Reservation.builder()
                .table(table)
                .customer(customer)
                .reservationTime(time)
                .status(ReservationStatus.PENDING)
                .build();

        Reservation saved = reservationRepository.save(reservation);
        webSocketService.sendUpdate("RESERVATION_CREATED", saved);
        return saved;
    }

    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }

    public List<Reservation> getPendingReservations() {
        return reservationRepository.findByStatus(ReservationStatus.PENDING);
    }

    public Reservation confirmReservation(Long id) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found: " + id));

        RestaurantTable table = reservation.getTable();
        if (table.getStatus() != TableStatus.AVAILABLE) {
            throw new IllegalStateException("Table is no longer available (currently " + table.getStatus() + ").");
        }

        reservation.setStatus(ReservationStatus.CONFIRMED);
        table.setStatus(TableStatus.RESERVED);
        table.setCurrentCustomer(reservation.getCustomer());
        tableRepository.save(table);

        Reservation saved = reservationRepository.save(reservation);
        webSocketService.sendUpdate("TABLE_UPDATE", table);
        webSocketService.sendUpdate("RESERVATION_UPDATED", saved);
        return saved;
    }

    public Reservation cancelReservation(Long id) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found: " + id));

        reservation.setStatus(ReservationStatus.CANCELLED);
        
        RestaurantTable table = reservation.getTable();
        if (table.getStatus() == TableStatus.RESERVED && table.getCurrentCustomer().getId().equals(reservation.getCustomer().getId())) {
            table.setStatus(TableStatus.AVAILABLE);
            table.setCurrentCustomer(null);
            tableRepository.save(table);
            webSocketService.sendUpdate("TABLE_UPDATE", table);
        }

        Reservation saved = reservationRepository.save(reservation);
        webSocketService.sendUpdate("RESERVATION_UPDATED", saved);
        return saved;
    }
}
