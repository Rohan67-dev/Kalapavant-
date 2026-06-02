package com.restaurant.platform;

import com.restaurant.platform.model.*;
import com.restaurant.platform.repository.*;
import com.restaurant.platform.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class PlatformApplicationTests {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private TableService tableService;

    @Autowired
    private MenuItemRepository menuItemRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    private RestaurantTable testTable;
    private MenuItem testDish;
    private MenuItem testDish2;

    @BeforeEach
    void setUp() {
        // Find or create test table (Table 1)
        testTable = tableService.getTableByNumber(1)
                .orElseGet(() -> tableService.initTable(1));

        // Find or create test menu items
        Optional<MenuItem> itemOpt = menuItemRepository.findByNameIgnoreCase("Paneer Tikka Masala");
        if (itemOpt.isPresent()) {
            testDish = itemOpt.get();
        } else {
            testDish = menuItemRepository.save(MenuItem.builder()
                    .name("Paneer Tikka Masala")
                    .price(280.0)
                    .category(MenuCategory.SABJI)
                    .chargeable(true)
                    .ingredients("paneer:150,onion:100,tomato:80")
                    .build());
        }

        Optional<MenuItem> itemOpt2 = menuItemRepository.findByNameIgnoreCase("Tandoori Roti");
        if (itemOpt2.isPresent()) {
            testDish2 = itemOpt2.get();
        } else {
            testDish2 = menuItemRepository.save(MenuItem.builder()
                    .name("Tandoori Roti")
                    .price(15.0)
                    .category(MenuCategory.ROTI)
                    .chargeable(true)
                    .ingredients("dough:60")
                    .build());
        }
    }

    @Test
    void testCustomerLoyaltyAndReferrals() {
        String customerMobile = "9876543200";
        String referrerMobile = "9876543201";

        Customer referrer = customerService.getOrCreateCustomer("Referrer Guy", referrerMobile, null);
        assertNotNull(referrer.getId());
        assertEquals(0, referrer.getReferralHistory().size());

        customerService.incrementVisitCount(referrer.getId());
        referrer = customerService.findById(referrer.getId()).orElseThrow();
        assertEquals(1, referrer.getVisitCount());
        assertEquals(0.0, referrer.getDiscountsEarned());

        Customer guest = customerService.getOrCreateCustomer("New Guest", customerMobile, referrerMobile);
        assertEquals(10.0, guest.getDiscountsEarned());

        referrer = customerService.findById(referrer.getId()).orElseThrow();
        assertEquals(1, referrer.getReferralHistory().size());
        assertEquals(2.0, referrer.getDiscountsEarned());

        customerService.addReferral(referrerMobile, "9876543202");
        customerService.addReferral(referrerMobile, "9876543203");
        
        referrer = customerService.findById(referrer.getId()).orElseThrow();
        assertEquals(3, referrer.getReferralHistory().size());
        assertEquals(5.0, referrer.getDiscountsEarned());

        for (int i = 4; i <= 10; i++) {
            customerService.addReferral(referrerMobile, "987654320" + i);
        }

        referrer = customerService.findById(referrer.getId()).orElseThrow();
        assertEquals(10, referrer.getReferralHistory().size());
        assertEquals(LoyaltyTier.PREMIUM, referrer.getLoyaltyTier());
        assertEquals(15.0, referrer.getDiscountsEarned());
    }

    @Test
    void testSrosSeatingAndCleaningLocks() {
        Customer customer = customerService.getOrCreateCustomer("Bob Clean", "9222222222", null);
        
        // Mark table as CLEANING_REQUIRED
        tableService.updateTableStatus(testTable.getId(), TableStatus.CLEANING_REQUIRED, null);
        
        // Assert checkIn is BLOCKED
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            tableService.checkIn(testTable.getTableNumber(), customer);
        });
        assertTrue(ex.getMessage().contains("Check-in blocked"));

        // Waiter starts cleaning
        tableService.startCleaning(testTable.getId());
        
        // Assert checkIn is still BLOCKED
        ex = assertThrows(IllegalStateException.class, () -> {
            tableService.checkIn(testTable.getTableNumber(), customer);
        });
        assertTrue(ex.getMessage().contains("Check-in blocked"));

        // Waiter completes cleaning
        tableService.completeCleaning(testTable.getId());
        
        // Assert checkIn is now ALLOWED
        assertDoesNotThrow(() -> {
            tableService.checkIn(testTable.getTableNumber(), customer);
        });
    }

    @Test
    void testSrosItemLevelCancellationAndLocks() {
        Customer customer = customerService.getOrCreateCustomer("Alice Sros", "9333333333", null);
        tableService.completeCleaning(testTable.getId());
        tableService.checkIn(testTable.getTableNumber(), customer);

        // Build order with 2 items
        List<OrderItem> items = new ArrayList<>();
        items.add(OrderItem.builder()
                .menuItem(testDish)
                .quantity(1)
                .seatNumber(1)
                .customerName("Alice")
                .status(ItemStatus.PENDING)
                .build());
        items.add(OrderItem.builder()
                .menuItem(testDish2)
                .quantity(3)
                .seatNumber(2)
                .customerName("Bob")
                .status(ItemStatus.PENDING)
                .build());

        Order order = orderService.createOrder(testTable.getId(), customer.getId(), items, false);
        assertNotNull(order.getId());
        assertEquals(2, order.getItems().size());

        // Cancel Item 1 (Tikka Masala) -> Partial cancellation (Allowed in PENDING)
        OrderItem item1 = order.getItems().get(0);
        OrderItem item2 = order.getItems().get(1);
        
        final Long item1Id = item1.getId();
        assertDoesNotThrow(() -> {
            orderService.cancelOrderItem(item1Id, true);
        });
        
        // Reload order from DB
        Order reloaded = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(1, reloaded.getItems().size());
        assertEquals(testDish2.getId(), reloaded.getItems().get(0).getMenuItem().getId());

        // Cook starts prep on remaining item (Locks cancellation)
        orderService.updateOrderItemStatus(item2.getId(), ItemStatus.IN_PROGRESS);

        // Try to cancel remaining item (Should throw Exception)
        final Long item2Id = item2.getId();
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            orderService.cancelOrderItem(item2Id, true);
        });
        assertTrue(ex.getMessage().contains("Cancellation blocked"));
    }
}
