package com.restaurant.platform.repository;

import com.restaurant.platform.model.AssistanceRequest;
import com.restaurant.platform.model.AssistanceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AssistanceRequestRepository extends JpaRepository<AssistanceRequest, Long> {
    List<AssistanceRequest> findByResolvedFalse();
    List<AssistanceRequest> findByTableIdAndResolvedFalse(Long tableId);
    List<AssistanceRequest> findByTableIdAndTypeAndResolvedFalse(Long tableId, AssistanceType type);
}
