package com.restaurant.platform.service;

import com.restaurant.platform.model.StaffMember;
import com.restaurant.platform.repository.StaffMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class StaffMemberService {

    private final StaffMemberRepository staffRepository;

    public StaffMemberService(StaffMemberRepository staffRepository) {
        this.staffRepository = staffRepository;
    }

    public StaffMember createStaffMember(String name, String mobileNumber, String password, String role) {
        Optional<StaffMember> existing = staffRepository.findByMobileNumber(mobileNumber);
        if (existing.isPresent()) {
            throw new RuntimeException("Staff member already registered with this mobile number.");
        }

        StaffMember staff = StaffMember.builder()
                .name(name)
                .mobileNumber(mobileNumber)
                .password(password)
                .role(role.toUpperCase())
                .build();

        return staffRepository.save(staff);
    }

    public StaffMember authenticateStaff(String mobileNumber, String password) {
        StaffMember staff = staffRepository.findByMobileNumber(mobileNumber)
                .orElseThrow(() -> new RuntimeException("Staff member not found."));

        if (!staff.getPassword().equals(password)) {
            throw new RuntimeException("Incorrect passcode. Try again!");
        }

        staff.setLastLoginTime(LocalDateTime.now());
        return staffRepository.save(staff);
    }

    public List<StaffMember> getAllStaff() {
        return staffRepository.findAll();
    }
}
