package com.bustrackr.dto.auth;

import lombok.Builder;

@Builder
public record LoginResponse(
        String token,
        String msg
) {
}
