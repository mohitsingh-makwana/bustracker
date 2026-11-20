package com.bustrackr.dto.driver;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateDriverRequest(

        @Size(max = 30, message = "License number must not exceed 30 characters")
        String licenseNumber,

        @Future(message = "License expiry date must be in the future")
        LocalDate licenseExpiryDate
) {
}