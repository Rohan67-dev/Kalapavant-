package com.restaurant.platform.repository;

import com.restaurant.platform.model.Reservation;
import com.restaurant.platform.model.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByStatus(ReservationStatus status);
    List<Reservation> findByTableId(Long tableId);
    List<Reservation> findByCustomerId(Long customerId);
}
