package com.bustrackr.dto.auth;

public record UserVerificationResponse(
        String email,
        String verificationToken,
        String message
) {
}
