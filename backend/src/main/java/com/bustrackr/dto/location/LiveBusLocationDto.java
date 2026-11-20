package com.bustrackr.dto.location;

import java.time.Instant;

public record LiveBusLocationDto(
        Long tripId,
        Double latitude,
        Double longitude
) {
}