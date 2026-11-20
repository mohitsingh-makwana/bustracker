package com.bustrackr.projection;

import com.bustrackr.enums.TripStatus;

public record TripStatusCountResponse(
        TripStatus status,
        Long count
) {
}
