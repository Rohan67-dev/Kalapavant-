package com.restaurant.platform.controller;

import com.restaurant.platform.model.MenuItem;
import com.restaurant.platform.model.MenuCategory;
import com.restaurant.platform.repository.MenuItemRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/menu")
@CrossOrigin(origins = "*")
public class MenuController {

    private final MenuItemRepository menuItemRepository;

    public MenuController(MenuItemRepository menuItemRepository) {
        this.menuItemRepository = menuItemRepository;
    }

    @GetMapping
    public List<MenuItem> getMenu(@RequestParam(required = false) String category) {
        if (category != null && !category.trim().isEmpty()) {
            try {
                MenuCategory cat = MenuCategory.valueOf(category.toUpperCase());
                return menuItemRepository.findByCategory(cat);
            } catch (IllegalArgumentException e) {
                // Return all if category is invalid
            }
        }
        return menuItemRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<MenuItem> getMenuItem(@PathVariable Long id) {
        return menuItemRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public MenuItem createMenuItem(@RequestBody MenuItem menuItem) {
        return menuItemRepository.save(menuItem);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMenuItem(@PathVariable Long id) {
        return menuItemRepository.findById(id)
                .map(item -> {
                    menuItemRepository.delete(item);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
