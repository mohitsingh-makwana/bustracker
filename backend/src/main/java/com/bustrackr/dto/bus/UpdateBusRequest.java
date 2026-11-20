package com.bustrackr.dto.bus;

import com.bustrackr.enums.BusStatus;

import java.time.LocalDate;

public record UpdateBusRequest(
        String busNumber,
        String registrationNumber,
        String model,
        Integer capacity,
        LocalDate lastServiceDate,
        LocalDate nextServiceDate,
        BusStatus status
) {
}
