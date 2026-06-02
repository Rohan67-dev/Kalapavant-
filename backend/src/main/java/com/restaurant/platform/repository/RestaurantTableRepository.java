package com.restaurant.platform.repository;

import com.restaurant.platform.model.RestaurantTable;
import com.restaurant.platform.model.TableStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RestaurantTableRepository extends JpaRepository<RestaurantTable, Long> {
    Optional<RestaurantTable> findByTableNumber(int tableNumber);
    List<RestaurantTable> findByStatus(TableStatus status);
}
