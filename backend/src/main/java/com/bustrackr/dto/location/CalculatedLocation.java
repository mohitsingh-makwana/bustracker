package com.bustrackr.dto.location;

public record CalculatedLocation(
        Double distanceMeters,
        Double speedMetersPerSecond
) {
}
