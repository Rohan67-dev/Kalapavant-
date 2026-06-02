package com.restaurant.platform.service;

import com.restaurant.platform.model.Customer;
import com.restaurant.platform.model.RestaurantTable;
import com.restaurant.platform.model.TableStatus;
import com.restaurant.platform.model.TableSeatMember;
import com.restaurant.platform.repository.RestaurantTableRepository;
import com.restaurant.platform.repository.TableSeatMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class TableService {

    private final RestaurantTableRepository tableRepository;
    private final TableSeatMemberRepository seatMemberRepository;
    private final WebSocketService webSocketService;

    public TableService(RestaurantTableRepository tableRepository, 
                        TableSeatMemberRepository seatMemberRepository,
                        WebSocketService webSocketService) {
        this.tableRepository = tableRepository;
        this.seatMemberRepository = seatMemberRepository;
        this.webSocketService = webSocketService;
    }

    public RestaurantTable initTable(int tableNumber) {
        Optional<RestaurantTable> existing = tableRepository.findByTableNumber(tableNumber);
        if (existing.isPresent()) {
            return existing.get();
        }

        // Create standard QR code pointing to this table's web view
        String qrData = "http://localhost:8080/?table=" + tableNumber;
        String qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + qrData;

        RestaurantTable table = RestaurantTable.builder()
                .tableNumber(tableNumber)
                .qrCode(qrUrl)
                .status(TableStatus.AVAILABLE)
                .build();

        return tableRepository.save(table);
    }

    public List<RestaurantTable> getAllTables() {
        return tableRepository.findAll();
    }

    public Optional<RestaurantTable> getTableByNumber(int tableNumber) {
        return tableRepository.findByTableNumber(tableNumber);
    }

    public RestaurantTable updateTableStatus(Long tableId, TableStatus status, Customer customer) {
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new IllegalArgumentException("Table not found with id: " + tableId));
        
        table.setStatus(status);
        if (status == TableStatus.AVAILABLE || status == TableStatus.CLEANING_REQUIRED || status == TableStatus.CLEANING_IN_PROGRESS) {
            table.setCurrentCustomer(null);
            if (status == TableStatus.AVAILABLE) {
                seatMemberRepository.deleteByTableId(tableId);
            }
        } else if (customer != null) {
            table.setCurrentCustomer(customer);
        }

        RestaurantTable saved = tableRepository.save(table);
        webSocketService.sendUpdate("TABLE_UPDATE", saved);
        return saved;
    }

    public RestaurantTable reserveTable(int tableNumber, Customer customer) {
        RestaurantTable table = tableRepository.findByTableNumber(tableNumber)
                .orElseThrow(() -> new IllegalArgumentException("Table not found: " + tableNumber));
        
        if (table.getStatus() != TableStatus.AVAILABLE) {
            throw new IllegalStateException("Table is not available for reservation");
        }

        table.setStatus(TableStatus.RESERVED);
        table.setCurrentCustomer(customer);
        
        RestaurantTable saved = tableRepository.save(table);
        webSocketService.sendUpdate("TABLE_UPDATE", saved);
        return saved;
    }

    public RestaurantTable checkIn(int tableNumber, Customer customer) {
        RestaurantTable table = tableRepository.findByTableNumber(tableNumber)
                .orElseThrow(() -> new IllegalArgumentException("Table not found: " + tableNumber));
        
        if (table.getStatus() == TableStatus.CLEANING_REQUIRED || 
            table.getStatus() == TableStatus.CLEANING_IN_PROGRESS || 
            table.getStatus() == TableStatus.OUT_OF_SERVICE) {
            throw new IllegalStateException("Check-in blocked: Table must be cleaned before check-in.");
        }

        table.setStatus(TableStatus.OCCUPIED);
        table.setCurrentCustomer(customer);
        
        RestaurantTable saved = tableRepository.save(table);
        webSocketService.sendUpdate("TABLE_UPDATE", saved);
        return saved;
    }

    // Seat-Wise Member Operations
    public TableSeatMember assignSeatMember(Long tableId, int seatNumber, String name, String mobile) {
        Optional<TableSeatMember> existing = seatMemberRepository.findByTableIdAndSeatNumber(tableId, seatNumber);
        TableSeatMember member;
        
        if (existing.isPresent()) {
            member = existing.get();
            member.setName(name);
            member.setMobileNumber(mobile);
        } else {
            member = TableSeatMember.builder()
                    .tableId(tableId)
                    .seatNumber(seatNumber)
                    .name(name)
                    .mobileNumber(mobile)
                    .build();
        }
        
        TableSeatMember saved = seatMemberRepository.save(member);
        webSocketService.sendUpdate("SEAT_UPDATE", saved);
        return saved;
    }

    public List<TableSeatMember> getSeatMembers(Long tableId) {
        return seatMemberRepository.findByTableId(tableId);
    }

    // SROS Cleaning Lifecycle
    public RestaurantTable startCleaning(Long tableId) {
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new IllegalArgumentException("Table not found: " + tableId));
        table.setStatus(TableStatus.CLEANING_IN_PROGRESS);
        RestaurantTable saved = tableRepository.save(table);
        webSocketService.sendUpdate("TABLE_UPDATE", saved);
        return saved;
    }

    public RestaurantTable completeCleaning(Long tableId) {
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new IllegalArgumentException("Table not found: " + tableId));
        table.setStatus(TableStatus.AVAILABLE);
        table.setCurrentCustomer(null);
        seatMemberRepository.deleteByTableId(tableId);
        RestaurantTable saved = tableRepository.save(table);
        webSocketService.sendUpdate("TABLE_UPDATE", saved);
        return saved;
    }
}
