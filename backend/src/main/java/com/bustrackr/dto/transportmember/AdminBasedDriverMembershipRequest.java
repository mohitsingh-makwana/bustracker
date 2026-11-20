package com.bustrackr.dto.transportmember;

import jakarta.validation.constraints.*;
import lombok.Builder;

import java.time.LocalDate;

@Builder
public record AdminBasedDriverMembershipRequest(
        @NotBlank(message = "Name is required")
        String name,

        @NotBlank(message = "Name is required")
        String address,

        @Email
        @NotBlank(message = "email is required")
        String email,

        @Pattern(regexp = "^[0-9]{10}$",
                message = "Mobile number must contain 10 digits")
        String phone,


        @NotBlank(message = "License no is required")
        String licenseNo,
        @FutureOrPresent(message = "Invalid Expiry date")
        @NotNull(message = "License Expiry is required")
        LocalDate licenseExpiryDate
) {
}
