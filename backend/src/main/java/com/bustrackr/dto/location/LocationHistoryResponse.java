package com.bustrackr.dto.location;

import java.time.LocalDateTime;

public record LocationHistoryResponse(
        Long id,
        Long tripId,
        Double latitude,
        Double longitude,
        Double speed,
        Double accuracyMeters,
        LocalDateTime recordedAt
) {
}