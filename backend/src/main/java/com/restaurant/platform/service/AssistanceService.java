package com.restaurant.platform.service;

import com.restaurant.platform.model.AssistanceRequest;
import com.restaurant.platform.model.AssistanceType;
import com.restaurant.platform.model.RestaurantTable;
import com.restaurant.platform.model.TableStatus;
import com.restaurant.platform.repository.AssistanceRequestRepository;
import com.restaurant.platform.repository.RestaurantTableRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class AssistanceService {

    private final AssistanceRequestRepository requestRepository;
    private final RestaurantTableRepository tableRepository;
    private final WebSocketService webSocketService;

    public AssistanceService(AssistanceRequestRepository requestRepository,
                             RestaurantTableRepository tableRepository,
                             WebSocketService webSocketService) {
        this.requestRepository = requestRepository;
        this.tableRepository = tableRepository;
        this.webSocketService = webSocketService;
    }

    public AssistanceRequest createRequest(int tableNumber, AssistanceType type) {
        RestaurantTable table = tableRepository.findByTableNumber(tableNumber)
                .orElseThrow(() -> new IllegalArgumentException("Table not found: " + tableNumber));

        // Check if there is an unresolved request of the same type for this table
        List<AssistanceRequest> existing = requestRepository.findByTableIdAndTypeAndResolvedFalse(table.getId(), type);
        if (!existing.isEmpty()) {
            return existing.get(0);
        }

        AssistanceRequest request = AssistanceRequest.builder()
                .table(table)
                .type(type)
                .timestamp(LocalDateTime.now())
                .resolved(false)
                .build();

        // If it's a bill request, update table status to BILLING_PENDING
        if (type == AssistanceType.BILL) {
            table.setStatus(TableStatus.BILLING_PENDING);
            tableRepository.save(table);
            webSocketService.sendUpdate("TABLE_UPDATE", table);
        }

        AssistanceRequest saved = requestRepository.save(request);
        webSocketService.sendUpdate("ASSISTANCE_REQUEST", saved);
        return saved;
    }

    public List<AssistanceRequest> getActiveRequests() {
        return requestRepository.findByResolvedFalse();
    }

    public AssistanceRequest resolveRequest(Long requestId) {
        AssistanceRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found: " + requestId));

        request.setResolved(true);
        AssistanceRequest saved = requestRepository.save(request);
        
        webSocketService.sendUpdate("ASSISTANCE_RESOLVED", saved);
        return saved;
    }
}
