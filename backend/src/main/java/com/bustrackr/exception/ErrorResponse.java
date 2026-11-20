package com.bustrackr.exception;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.Map;

@Builder
public record ErrorResponse(
        LocalDateTime timestamp,
        int statusCode,
        String message,
        Map<String,String> errors) {
}
