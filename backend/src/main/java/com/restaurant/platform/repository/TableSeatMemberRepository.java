package com.restaurant.platform.repository;

import com.restaurant.platform.model.TableSeatMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TableSeatMemberRepository extends JpaRepository<TableSeatMember, Long> {
    List<TableSeatMember> findByTableId(Long tableId);
    Optional<TableSeatMember> findByTableIdAndSeatNumber(Long tableId, int seatNumber);
    void deleteByTableId(Long tableId);
}
