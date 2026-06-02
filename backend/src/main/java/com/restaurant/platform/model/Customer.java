package com.restaurant.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "customers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String mobileNumber;

    @Builder.Default
    private int visitCount = 0;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "customer_referrals", joinColumns = @JoinColumn(name = "customer_id"))
    @Column(name = "referred_mobile")
    @Builder.Default
    private List<String> referralHistory = new ArrayList<>();

    @Builder.Default
    private double discountsEarned = 0.0; // stores current discount percentage (e.g. 5.0 for 5%)

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LoyaltyTier loyaltyTier = LoyaltyTier.REGULAR;
}
