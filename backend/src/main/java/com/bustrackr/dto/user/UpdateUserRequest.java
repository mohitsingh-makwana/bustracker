package com.bustrackr.dto.user;

import jakarta.validation.constraints.Email;

public record UpdateUserRequest(

        @Email(message = "Invalid email format")
        String email,

        String phone
) {
}