package com.bustrackr.dto.auth;

public record UserVerificationRequest(
        String email,
        String otp
) {
}
