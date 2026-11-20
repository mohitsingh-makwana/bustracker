package com.bustrackr.dto.bus;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record CreateBusRequest(

        @NotBlank(message = "Bus number is required")
        @Size(max = 30, message = "Bus number must not exceed 30 characters")
        String busNumber,

        @NotBlank(message = "Registration number is required")
        @Size(max = 30, message = "Registration number must not exceed 30 characters")
        String registrationNumber,

        @Size(max = 100, message = "Model must not exceed 100 characters")
        String model,

        @NotNull(message = "Capacity is required")
        @Min(value = 1, message = "Capacity must be greater than 0")
        Integer capacity,

        LocalDate lastServiceDate,

        LocalDate nextServiceDate
) {
}