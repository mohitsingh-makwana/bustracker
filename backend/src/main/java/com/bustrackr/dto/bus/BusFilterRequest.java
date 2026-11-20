package com.bustrackr.dto.bus;

import com.bustrackr.enums.BusStatusFilter;

import java.time.LocalDate;

public record BusFilterRequest(
        BusStatusFilter status,
        String registrationNumber,
        String busNumber,
        String model,
        LocalDate lastServiceDate,
        LocalDate nextServiceDate
) {
}
