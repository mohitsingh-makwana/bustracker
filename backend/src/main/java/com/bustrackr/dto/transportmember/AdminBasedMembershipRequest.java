package com.bustrackr.dto.transportmember;

import com.bustrackr.enums.TransportMemberRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record AdminBasedMembershipRequest(
        @Email
        @NotBlank(message = "email required")
        String email,

        @NotBlank(message = "email required")
        String fullName,

        @Pattern(regexp = "^[0-9]{10}$",
                message = "Mobile number must contain 10 digits")
        @NotBlank(message = "phone no. is required")
        String phone,

        @NotNull(message = "role required!")
        TransportMemberRole role
) {
}
