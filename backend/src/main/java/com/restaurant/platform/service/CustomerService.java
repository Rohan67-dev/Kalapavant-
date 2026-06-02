package com.restaurant.platform.service;

import com.restaurant.platform.model.Customer;
import com.restaurant.platform.model.LoyaltyTier;
import com.restaurant.platform.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Optional;

@Service
@Transactional
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final WebSocketService webSocketService;

    public CustomerService(CustomerRepository customerRepository, WebSocketService webSocketService) {
        this.customerRepository = customerRepository;
        this.webSocketService = webSocketService;
    }

    public Customer getOrCreateCustomer(String name, String mobileNumber, String referrerMobile) {
        Optional<Customer> existing = customerRepository.findByMobileNumber(mobileNumber);
        
        if (existing.isPresent()) {
            return existing.get();
        }

        // Create new customer
        Customer customer = Customer.builder()
                .name(name)
                .mobileNumber(mobileNumber)
                .visitCount(0) // First visit
                .referralHistory(new ArrayList<>())
                .discountsEarned(10.0) // 10% discount on first visit
                .loyaltyTier(LoyaltyTier.REGULAR)
                .build();

        Customer savedCustomer = customerRepository.save(customer);

        // Process referral if provided
        if (referrerMobile != null && !referrerMobile.trim().isEmpty() && !referrerMobile.equals(mobileNumber)) {
            addReferral(referrerMobile, mobileNumber);
        }

        webSocketService.sendUpdate("CUSTOMER_REGISTRATION", savedCustomer);
        return savedCustomer;
    }

    public void addReferral(String referrerMobile, String referredMobile) {
        Optional<Customer> referrerOpt = customerRepository.findByMobileNumber(referrerMobile);
        if (referrerOpt.isPresent()) {
            Customer referrer = referrerOpt.get();
            if (!referrer.getReferralHistory().contains(referredMobile)) {
                referrer.getReferralHistory().add(referredMobile);
                updateLoyaltyAndDiscounts(referrer);
                customerRepository.save(referrer);
                webSocketService.sendUpdate("REFERRAL_UPDATE", referrer);
            }
        }
    }

    public void incrementVisitCount(Long customerId) {
        customerRepository.findById(customerId).ifPresent(customer -> {
            customer.setVisitCount(customer.getVisitCount() + 1);
            // After first visit, reset the first-visit automatic discount
            updateLoyaltyAndDiscounts(customer);
            customerRepository.save(customer);
            webSocketService.sendUpdate("CUSTOMER_UPDATE", customer);
        });
    }

    public void updateLoyaltyAndDiscounts(Customer customer) {
        int referrals = customer.getReferralHistory().size();
        
        // Determine loyalty tier
        if (referrals >= 10) {
            customer.setLoyaltyTier(LoyaltyTier.PREMIUM);
        } else {
            customer.setLoyaltyTier(LoyaltyTier.REGULAR);
        }

        // Calculate discount percentage
        if (customer.getVisitCount() == 0) {
            // First visit gets 10% discount
            customer.setDiscountsEarned(10.0);
        } else {
            // Discounts based on referrals
            if (referrals >= 10) {
                customer.setDiscountsEarned(15.0); // Premium member gets 15% discount
            } else if (referrals >= 3) {
                customer.setDiscountsEarned(5.0); // 3 referrals gets 5%
            } else if (referrals >= 1) {
                customer.setDiscountsEarned(2.0); // 1 referral gets 2%
            } else {
                customer.setDiscountsEarned(0.0); // returning customer, no automatic discount
            }
        }
    }

    public Optional<Customer> findByMobileNumber(String mobileNumber) {
        return customerRepository.findByMobileNumber(mobileNumber);
    }

    public Optional<Customer> findById(Long id) {
        return customerRepository.findById(id);
    }
}
