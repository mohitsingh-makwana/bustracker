package com.bustrackr.dto.auth;

import lombok.Builder;

@Builder
public record LoginRequest(
        String username,
        String password
) {
}
