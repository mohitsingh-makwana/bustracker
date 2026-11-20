package com.bustrackr.dto.bus;

import com.bustrackr.enums.BusStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record BusResponse(
        Long id,
        Long transportSystemId,
        String transportSystemName,
        String busNumber,
        String registrationNumber,
        String model,
        Integer capacity,
        BusStatus status,
        LocalDate lastServiceDate,
        LocalDate nextServiceDate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}