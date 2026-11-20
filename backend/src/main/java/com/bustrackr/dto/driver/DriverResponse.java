package com.bustrackr.dto.driver;

import com.bustrackr.enums.DriverStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record DriverResponse(
        Long id,
        Long memberId,
        String name,
        String address,
        String licenseNumber,
        LocalDate licenseExpiryDate,
        DriverStatus status
) {
}