package com.restaurant.platform.config;

import com.restaurant.platform.model.MenuItem;
import com.restaurant.platform.model.MenuCategory;
import com.restaurant.platform.model.RestaurantTable;
import com.restaurant.platform.repository.MenuItemRepository;
import com.restaurant.platform.service.TableService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import java.util.Arrays;
import java.util.List;

@Configuration
public class DataInitializer implements CommandLineRunner {

    private final MenuItemRepository menuItemRepository;
    private final TableService tableService;

    public DataInitializer(MenuItemRepository menuItemRepository, TableService tableService) {
        this.menuItemRepository = menuItemRepository;
        this.tableService = tableService;
    }

    @Override
    public void run(String... args) throws Exception {
        // Seed Menu Items
        if (menuItemRepository.count() == 0) {
            List<MenuItem> defaultItems = Arrays.asList(
                // Sabji Items
                MenuItem.builder()
                        .name("Paneer Tikka Masala")
                        .price(280.0)
                        .category(MenuCategory.SABJI)
                        .chargeable(true)
                        .ingredients("paneer:150,onion:100,tomato:80")
                        .build(),
                MenuItem.builder()
                        .name("Kadai Paneer")
                        .price(260.0)
                        .category(MenuCategory.SABJI)
                        .chargeable(true)
                        .ingredients("paneer:120,onion:120,tomato:100")
                        .build(),
                MenuItem.builder()
                        .name("Butter Paneer")
                        .price(270.0)
                        .category(MenuCategory.SABJI)
                        .chargeable(true)
                        .ingredients("paneer:150,onion:80,tomato:150")
                        .build(),
                MenuItem.builder()
                        .name("Veg Kolhapuri")
                        .price(220.0)
                        .category(MenuCategory.SABJI)
                        .chargeable(true)
                        .ingredients("paneer:50,onion:140,tomato:120")
                        .build(),

                // Roti Items
                MenuItem.builder()
                        .name("Tandoori Roti")
                        .price(15.0)
                        .category(MenuCategory.ROTI)
                        .chargeable(true)
                        .ingredients("dough:60")
                        .build(),
                MenuItem.builder()
                        .name("Butter Roti")
                        .price(20.0)
                        .category(MenuCategory.ROTI)
                        .chargeable(true)
                        .ingredients("dough:60")
                        .build(),
                MenuItem.builder()
                        .name("Naan")
                        .price(40.0)
                        .category(MenuCategory.ROTI)
                        .chargeable(true)
                        .ingredients("dough:80")
                        .build(),

                // Add-ons (Chargeable)
                MenuItem.builder()
                        .name("Extra Butter")
                        .price(15.0)
                        .category(MenuCategory.ADD_ON)
                        .chargeable(true)
                        .ingredients("")
                        .build(),
                MenuItem.builder()
                        .name("Onion Plate")
                        .price(15.0)
                        .category(MenuCategory.ADD_ON)
                        .chargeable(true)
                        .ingredients("onion:80")
                        .build(),

                // Add-ons (Non-chargeable)
                MenuItem.builder()
                        .name("Basic Condiments")
                        .price(0.0)
                        .category(MenuCategory.ADD_ON)
                        .chargeable(false)
                        .ingredients("")
                        .build(),

                // Beverages (Chargeable)
                MenuItem.builder()
                        .name("Water Bottle")
                        .price(20.0)
                        .category(MenuCategory.BEVERAGE)
                        .chargeable(true)
                        .ingredients("")
                        .build(),
                MenuItem.builder()
                        .name("Cold Drink")
                        .price(35.0)
                        .category(MenuCategory.BEVERAGE)
                        .chargeable(true)
                        .ingredients("")
                        .build(),

                // Beverages (Non-chargeable)
                MenuItem.builder()
                        .name("Normal Water")
                        .price(0.0)
                        .category(MenuCategory.BEVERAGE)
                        .chargeable(false)
                        .ingredients("")
                        .build(),

                // Salad (Chargeable)
                MenuItem.builder()
                        .name("Green Salad")
                        .price(50.0)
                        .category(MenuCategory.SALAD)
                        .chargeable(true)
                        .ingredients("onion:50,tomato:50")
                        .build(),

                // Dessert (Chargeable)
                MenuItem.builder()
                        .name("Vanilla Ice Cream")
                        .price(60.0)
                        .category(MenuCategory.DESSERT)
                        .chargeable(true)
                        .ingredients("")
                        .build()
            );

            menuItemRepository.saveAll(defaultItems);
            System.out.println("Default menu items seeded!");
        }

        // Seed Tables
        for (int i = 1; i <= 6; i++) {
            tableService.initTable(i);
        }
        System.out.println("Default tables (1-6) initialized!");
    }
}
