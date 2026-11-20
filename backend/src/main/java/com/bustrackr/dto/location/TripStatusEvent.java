package com.bustrackr.dto.location;

import com.bustrackr.enums.TripStatus;

import java.time.Instant;

public record TripStatusEvent(
        Long tripId,
        TripStatus status,
        Instant at
) {
}
