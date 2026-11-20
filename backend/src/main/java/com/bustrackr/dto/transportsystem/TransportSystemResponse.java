package com.bustrackr.dto.transportsystem;

import com.bustrackr.enums.AccessType;
import com.bustrackr.enums.TransportSystemStatus;

import java.time.LocalDateTime;

public record TransportSystemResponse(
        Long id,
        String transportCode,
        String name,
        String description,
        AccessType accessType,
        String city,
        String area,
        Double latitude,
        Double longitude,
        TransportSystemStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}