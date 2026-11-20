package com.bustrackr.projection;

public record ActiveTripsCountResponse(
        Long transportSystemId,
        Long tripCount
) {
}
