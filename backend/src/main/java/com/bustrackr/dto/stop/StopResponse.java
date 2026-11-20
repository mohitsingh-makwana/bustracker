package com.bustrackr.dto.stop;

import com.bustrackr.enums.StopStatus;

import java.time.LocalDateTime;

public record StopResponse(
        Long id,
        Long transportSystemId,
        String transportSystemName,
        String stopCode,
        String name,
        String address,
        Double latitude,
        Double longitude,
        StopStatus status
       ) {
}