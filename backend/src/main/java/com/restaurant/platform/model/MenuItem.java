package com.restaurant.platform.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "menu_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private double price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MenuCategory category;

    @Column(nullable = false)
    @Builder.Default
    private boolean chargeable = true;

    // JSON or comma-separated ingredients list for AI, e.g. "paneer:150,onion:100,tomato:80"
    @Column(columnDefinition = "TEXT")
    private String ingredients;
}
