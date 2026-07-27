package com.restaurant.platform.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "assistance_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssistanceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "table_id", nullable = false)
    private RestaurantTable table;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssistanceType type;

    @Column(nullable = true)
    private Integer seatNumber;

    @Builder.Default
    private boolean resolved = false;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
