package com.restaurant.platform.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "table_seat_members", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"table_id", "seatNumber"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TableSeatMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "table_id", nullable = false)
    private Long tableId;

    @Column(nullable = false)
    private int seatNumber; // 1 to 4

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String mobileNumber;
}
