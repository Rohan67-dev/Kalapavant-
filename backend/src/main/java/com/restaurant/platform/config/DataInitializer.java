package com.restaurant.platform.config;

import com.restaurant.platform.model.MenuItem;
import com.restaurant.platform.model.MenuCategory;
import com.restaurant.platform.model.RestaurantTable;
import com.restaurant.platform.repository.MenuItemRepository;
import com.restaurant.platform.repository.StaffMemberRepository;
import com.restaurant.platform.model.StaffMember;
import com.restaurant.platform.service.TableService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import java.util.Arrays;
import java.util.List;

@Configuration
public class DataInitializer implements CommandLineRunner {

    private final MenuItemRepository menuItemRepository;
    private final TableService tableService;
    private final StaffMemberRepository staffRepository;

    public DataInitializer(MenuItemRepository menuItemRepository, TableService tableService, StaffMemberRepository staffRepository) {
        this.menuItemRepository = menuItemRepository;
        this.tableService = tableService;
        this.staffRepository = staffRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        // Seed Menu Items
        if (menuItemRepository.count() == 0) {
            List<MenuItem> defaultItems = Arrays.asList(
                // 1. SOUP
                MenuItem.builder().name("Tomato Soup").price(110.0).category(MenuCategory.SOUP).ingredients("").build(),
                MenuItem.builder().name("Hot and Sour Soup").price(120.0).category(MenuCategory.SOUP).ingredients("").build(),
                MenuItem.builder().name("Sweet Corn Soup").price(120.0).category(MenuCategory.SOUP).ingredients("").build(),
                MenuItem.builder().name("Mushroom Soup").price(130.0).category(MenuCategory.SOUP).ingredients("").build(),
                MenuItem.builder().name("Lemon Coriander Soup").price(110.0).category(MenuCategory.SOUP).ingredients("").build(),
                MenuItem.builder().name("Cheese Corn Tomato Soup").price(140.0).category(MenuCategory.SOUP).ingredients("").build(),
                MenuItem.builder().name("Veg Clear Soup").price(100.0).category(MenuCategory.SOUP).ingredients("").build(),
                MenuItem.builder().name("Broccoli Almond Soup").price(150.0).category(MenuCategory.SOUP).ingredients("").build(),

                // 2. SALAD
                MenuItem.builder().name("Green Salad").price(60.0).category(MenuCategory.SALAD).ingredients("onion:50,tomato:50").build(),
                MenuItem.builder().name("Tomato Salad").price(50.0).category(MenuCategory.SALAD).ingredients("tomato:100").build(),

                // 3. STARTER
                MenuItem.builder().name("Mushroom Chilli Dry").price(210.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Paneer Crispy").price(230.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Spring Roll [6 Pieces]").price(180.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("French Fry").price(110.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Peri Peri French Fry").price(130.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Cheese Peri Peri French Fry").price(160.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Veg 65").price(190.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Paneer 65").price(230.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Cheese Ball [8 Pieces]").price(220.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Veg Crispy").price(200.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Paneer Schezwan Dry").price(240.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Baby Corn Chilli Dry").price(210.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Today's Special Starter").price(250.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Paneer Tikka Dry").price(240.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Paneer Pudina Tikka Dry").price(250.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Hara Bhara Kabab").price(190.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Green Manchurian Dry").price(180.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Manchurian Dry").price(170.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Veg Loli Pop").price(200.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Paneer Chilli Dry").price(220.0).category(MenuCategory.STARTER).ingredients("").build(),
                MenuItem.builder().name("Chinese Bhel").price(160.0).category(MenuCategory.STARTER).ingredients("").build(),

                // 4. MAIN COURSE (SABJI)
                MenuItem.builder().name("Cheese Butter Masala").price(280.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Cheese Angara").price(290.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Cheese Tawa").price(280.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Cheese Kaju").price(300.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Cheese Paneer").price(290.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Cheese Kadai").price(290.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Paneer Kofta").price(260.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Kaju Kofta").price(270.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Veg Kofta").price(220.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Malai Kofta [sweet]").price(240.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Kaju Tadka").price(260.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Kaju Kadai").price(280.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Paneer Toofani").price(270.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Paneer Tawa").price(260.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Paneer Angara").price(270.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Paneer Tikka Masala").price(280.0).category(MenuCategory.SABJI).ingredients("paneer:150,onion:100,tomato:80").build(),
                MenuItem.builder().name("Paneer Butter Masala").price(270.0).category(MenuCategory.SABJI).ingredients("paneer:150,onion:80,tomato:150").build(),
                MenuItem.builder().name("Paneer Handi").price(270.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Paneer Kadai").price(260.0).category(MenuCategory.SABJI).ingredients("paneer:120,onion:120,tomato:100").build(),
                MenuItem.builder().name("Palak Paneer").price(240.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Mutter Paneer").price(240.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Chana Paneer").price(230.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Paneer Bhurji").price(290.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Shahi Paneer").price(280.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Paneer Lasaniya").price(250.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Paneer Kolhapuri").price(260.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Kaju Curry").price(270.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Kaju Paneer").price(280.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Paneer Chatpata").price(250.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Special Kalpvant Paneer").price(310.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Dal Tadka").price(180.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Veg Kadai").price(220.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Veg Jaipuri").price(230.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Veg Kolhapuri").price(220.0).category(MenuCategory.SABJI).ingredients("paneer:50,onion:140,tomato:120").build(),
                MenuItem.builder().name("Veg Makkhanwala").price(230.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Veg Hangama").price(240.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Veg Kheema Masala").price(230.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Navratna Korma [sweet]").price(250.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Baby Corn Masala").price(240.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Mushroom Masala").price(250.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Mix Vegetable").price(210.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Sev Tomato").price(160.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Chana Masala").price(180.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Aloo Mutter/gobi/palak").price(170.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Dal Fry").price(150.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Dal Fry Butter").price(170.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Veg Handi").price(230.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Veg Toofani").price(240.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Veg Angara").price(240.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Special Veg Kalpvant").price(280.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Paneer Chilli Gravy").price(230.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Manchurian Gravy").price(210.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Baby Corn Chilli Gravy").price(220.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Today Special Paneer").price(290.0).category(MenuCategory.SABJI).ingredients("").build(),
                MenuItem.builder().name("Special Veg Today").price(260.0).category(MenuCategory.SABJI).ingredients("").build(),

                // 5. BREADS (ROTI)
                MenuItem.builder().name("Plain Tandoori Roti").price(15.0).category(MenuCategory.ROTI).ingredients("dough:60").build(),
                MenuItem.builder().name("Butter Tandoori Roti").price(20.0).category(MenuCategory.ROTI).ingredients("dough:60").build(),
                MenuItem.builder().name("Plain Tandoori Paratha").price(35.0).category(MenuCategory.ROTI).ingredients("dough:80").build(),
                MenuItem.builder().name("Butter Tandoori Paratha").price(40.0).category(MenuCategory.ROTI).ingredients("dough:80").build(),
                MenuItem.builder().name("Plain Naan").price(40.0).category(MenuCategory.ROTI).ingredients("dough:80").build(),
                MenuItem.builder().name("Butter Naan").price(45.0).category(MenuCategory.ROTI).ingredients("dough:80").build(),
                MenuItem.builder().name("Butter Garlic Naan").price(60.0).category(MenuCategory.ROTI).ingredients("dough:80").build(),
                MenuItem.builder().name("Cheese Naan").price(75.0).category(MenuCategory.ROTI).ingredients("dough:90").build(),
                MenuItem.builder().name("Cheese Garlic Naan").price(85.0).category(MenuCategory.ROTI).ingredients("dough:90").build(),
                MenuItem.builder().name("Cheese Butter Naan").price(80.0).category(MenuCategory.ROTI).ingredients("dough:90").build(),
                MenuItem.builder().name("Plain Chapati").price(12.0).category(MenuCategory.ROTI).ingredients("dough:40").build(),
                MenuItem.builder().name("Butter Chapati").price(15.0).category(MenuCategory.ROTI).ingredients("dough:40").build(),
                MenuItem.builder().name("Plain Chapati Paratha").price(30.0).category(MenuCategory.ROTI).ingredients("dough:60").build(),
                MenuItem.builder().name("Butter Chapati Paratha").price(35.0).category(MenuCategory.ROTI).ingredients("dough:60").build(),
                MenuItem.builder().name("Tandoori Aloo Paratha").price(70.0).category(MenuCategory.ROTI).ingredients("dough:100").build(),
                MenuItem.builder().name("Roti Basket").price(180.0).category(MenuCategory.ROTI).ingredients("2 Tandoori Roti+4 Butter Chapati+1 Garlic Naan+1 Kulcha").build(),
                MenuItem.builder().name("Chapati Aloo Paratha").price(60.0).category(MenuCategory.ROTI).ingredients("dough:100").build(),

                // 6. RICE & BIRYANI (RICE)
                MenuItem.builder().name("Veg Biryani").price(220.0).category(MenuCategory.RICE).ingredients("").build(),
                MenuItem.builder().name("Haidrabadi Biryani").price(240.0).category(MenuCategory.RICE).ingredients("").build(),
                MenuItem.builder().name("Today's Special Biryani").price(260.0).category(MenuCategory.RICE).ingredients("").build(),
                MenuItem.builder().name("Tadka Khichdi").price(180.0).category(MenuCategory.RICE).ingredients("").build(),
                MenuItem.builder().name("Dal Khichdi").price(170.0).category(MenuCategory.RICE).ingredients("").build(),
                MenuItem.builder().name("Steam Rice").price(110.0).category(MenuCategory.RICE).ingredients("").build(),
                MenuItem.builder().name("Jeera Rice").price(130.0).category(MenuCategory.RICE).ingredients("").build(),
                MenuItem.builder().name("Plain Rice").price(100.0).category(MenuCategory.RICE).ingredients("").build(),
                MenuItem.builder().name("Kashmiri Pulav").price(200.0).category(MenuCategory.RICE).ingredients("").build(),
                MenuItem.builder().name("Kaju Pulav").price(220.0).category(MenuCategory.RICE).ingredients("").build(),
                MenuItem.builder().name("Paneer Pulav").price(210.0).category(MenuCategory.RICE).ingredients("").build(),
                MenuItem.builder().name("Veg Pulav").price(190.0).category(MenuCategory.RICE).ingredients("").build(),
                MenuItem.builder().name("Masala Rice").price(160.0).category(MenuCategory.RICE).ingredients("").build(),

                // 7. FRIED RICE & NOODLES, SNACKS, ACCOMPANIMENTS (ADD_ON)
                MenuItem.builder().name("Hakka Noodles").price(180.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Schezwan Noodles").price(190.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Brown Garlic Noodles").price(200.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Veg Fried Rice").price(180.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Munchurian Fried Rice").price(210.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Schezwan Fried Rice").price(190.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Singapuri Fried Rice").price(200.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Mushroom Fried Rice").price(220.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Triple Schezwan Fried Rice").price(250.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Plain Kulcha").price(40.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Butter Kulcha").price(45.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Roasted Papad").price(15.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Fry Papad").price(20.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Masala Papad").price(35.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Cheese Masala Papad").price(55.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Veg Raita").price(70.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Pineapple Raita [sweet]").price(90.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Bundi Raita").price(70.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Plain Curd").price(40.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Basic Condiments").price(0.0).category(MenuCategory.ADD_ON).chargeable(false).ingredients("").build(),
                MenuItem.builder().name("Extra Butter").price(15.0).category(MenuCategory.ADD_ON).ingredients("").build(),
                MenuItem.builder().name("Onion Plate").price(15.0).category(MenuCategory.ADD_ON).ingredients("onion:80").build(),

                // 8. SWEETS (DESSERT)
                MenuItem.builder().name("Khoya Kaju [sweet]").price(120.0).category(MenuCategory.DESSERT).ingredients("").build(),
                MenuItem.builder().name("Vanilla Ice Cream").price(60.0).category(MenuCategory.DESSERT).ingredients("").build(),

                // 9. DRINKS (BEVERAGE)
                MenuItem.builder().name("Kesar Pista Milk Shake").price(140.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Chocolate Milk Shake").price(130.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Kaju Chocolate Milk Shake").price(150.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Kaju Mango Milk Shake").price(150.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Vanilla Milk Shake").price(120.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Rose Milk Shake").price(120.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Cold Coffee with Ice Cream").price(140.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Fresh Lime Water").price(40.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Fresh Lime Soda").price(60.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Butter Milk").price(20.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Masala Butter Milk").price(25.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Lassi").price(70.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Chocolate Lassi").price(85.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Kaju Lassi").price(95.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Rose Lassi").price(85.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Special Kalpvant Lassi").price(110.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Plain Lassi").price(60.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Water Bottle").price(20.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Cold Drink").price(35.0).category(MenuCategory.BEVERAGE).ingredients("").build(),
                MenuItem.builder().name("Normal Water").price(0.0).category(MenuCategory.BEVERAGE).chargeable(false).ingredients("").build(),

                // 10. COMBOS
                MenuItem.builder().name("Dal Fry with Rice").price(190.0).category(MenuCategory.COMBO).ingredients("Dal Fry [250 g]+Jeera Rice [250 g]+Buttermilk+Roasted Papad").build(),
                MenuItem.builder().name("Dal Tadka with Rice").price(200.0).category(MenuCategory.COMBO).ingredients("Dal Tadka [250 g]+Jeera Rice [250 g]+Buttermilk+Roasted Papad").build(),
                MenuItem.builder().name("Paneer Tikka Masala with Chapati & Rice").price(260.0).category(MenuCategory.COMBO).ingredients("Paneer Tikka Masala [250 g]+4 Butter Chapati+Masala Rice").build(),
                MenuItem.builder().name("Mix Veg with Chapati & Rice").price(240.0).category(MenuCategory.COMBO).ingredients("Mix Veg [250 g]+4 Butter Chapati+Masala Rice").build(),
                MenuItem.builder().name("Chinese Bhel with Manchurian Dry").price(290.0).category(MenuCategory.COMBO).ingredients("Chinese Bhel [450 g]+Manchurian Dry [450 g]+1 Pepsi Soft Beverage [200 ml]").build(),
                MenuItem.builder().name("Veg Fried Rice with Manchurian Gravy").price(270.0).category(MenuCategory.COMBO).ingredients("Veg Fried Rice [450 g]+Manchurian Gravy [450 g]+1 Pepsi Soft Beverage [200 ml]").build(),
                MenuItem.builder().name("Veg Fried Rice with Paneer Chilli Gravy").price(290.0).category(MenuCategory.COMBO).ingredients("Veg Fried Rice [450 g]+Paneer Chilli Gravy [450 g]+1 Pepsi Soft Beverage [200 ml]").build(),
                MenuItem.builder().name("Hakka Noodles with Manchurian Gravy").price(270.0).category(MenuCategory.COMBO).ingredients("Hakka Noodles [450 g]+Manchurian Gravy [450 g]+1 Pepsi Soft Beverage [200 ml]").build()
            );

            menuItemRepository.saveAll(defaultItems);
            System.out.println("Default menu items seeded!");
        }

        // Seed Tables
        for (int i = 1; i <= 6; i++) {
            tableService.initTable(i);
        }
        System.out.println("Default tables (1-6) initialized!");

        // Seed Staff Members
        if (staffRepository.count() == 0) {
            List<StaffMember> defaultStaff = Arrays.asList(
                StaffMember.builder().name("Default Owner").mobileNumber("0000000000").password("0000").role("OWNER").build(),
                StaffMember.builder().name("Default Manager").mobileNumber("1010101010").password("1010").role("MANAGER").build(),
                StaffMember.builder().name("Default Waiter").mobileNumber("1111111111").password("1111").role("WAITER").build(),
                StaffMember.builder().name("Default Sabji Cook").mobileNumber("2222222222").password("2222").role("SABJI_COOK").build(),
                StaffMember.builder().name("Default Roti Cook").mobileNumber("3333333333").password("3333").role("ROTI_COOK").build(),
                StaffMember.builder().name("Default Billing Operator").mobileNumber("4444444444").password("4444").role("BILLING").build()
            );
            staffRepository.saveAll(defaultStaff);
            System.out.println("Default SROS staff members seeded!");
        }
    }
}
