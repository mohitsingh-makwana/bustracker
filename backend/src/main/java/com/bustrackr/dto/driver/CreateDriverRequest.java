package com.bustrackr.dto.driver;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.time.LocalDate;

@Builder
public record CreateDriverRequest(

        @NotNull(message = "Member id is required")
        Long memberId,

        @NotBlank(message = "Driver name is required")
        String name,

        @NotBlank(message = "Address is required")
        String address,

        @NotBlank(message = "License number is required")
        @Size(max = 30, message = "License number must not exceed 30 characters")
        String licenseNumber,

        @NotNull(message = "License expiry date is required")
        @Future(message = "License expiry date must be in the future")
        LocalDate licenseExpiryDate
) {
}