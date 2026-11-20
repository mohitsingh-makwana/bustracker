package com.bustrackr.dto.driver;

import com.bustrackr.enums.DriverStatus;

public record DriverFilter(
        String name,
        String address,
        String licenseNumber,
        DriverStatus status
) {
}
