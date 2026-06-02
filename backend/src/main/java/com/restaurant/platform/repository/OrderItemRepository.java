package com.restaurant.platform.repository;

import com.restaurant.platform.model.OrderItem;
import com.restaurant.platform.model.ItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByStatus(ItemStatus status);
}
