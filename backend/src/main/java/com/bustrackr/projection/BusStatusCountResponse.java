package com.bustrackr.projection;

import com.bustrackr.enums.BusStatus;

public record BusStatusCountResponse(
        BusStatus status,
        Long count
) {
}
