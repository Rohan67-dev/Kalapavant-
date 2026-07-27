package com.restaurant.platform.util;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ValidationUtils {

    public static void validateName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Name cannot be empty.");
        }
        if (!name.matches("^[a-zA-Z\\s]+$")) {
            throw new IllegalArgumentException("Name must only contain alphabetic characters and spaces.");
        }
    }

    public static void validateMobile(String mobile) {
        if (mobile == null || mobile.trim().isEmpty()) {
            throw new IllegalArgumentException("Mobile number cannot be empty.");
        }
        if (!mobile.matches("^\\d{10}$")) {
            throw new IllegalArgumentException("Mobile number must be exactly 10 digits.");
        }
    }

    public static void validateReservationDate(LocalDateTime dateTime) {
        if (dateTime == null) {
            throw new IllegalArgumentException("Reservation date and time is required.");
        }
        LocalDate today = LocalDate.now();
        LocalDate bookingDate = dateTime.toLocalDate();
        if (bookingDate.isBefore(today)) {
            throw new IllegalArgumentException("Reservation date cannot be in the past.");
        }
        if (bookingDate.isAfter(today.plusDays(7))) {
            throw new IllegalArgumentException("Reservation can only be made up to 7 days in advance.");
        }
    }
}
