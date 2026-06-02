package com.restaurant.platform.repository;

import com.restaurant.platform.model.MenuItem;
import com.restaurant.platform.model.MenuCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    List<MenuItem> findByCategory(MenuCategory category);
    Optional<MenuItem> findByNameIgnoreCase(String name);
}
