package com.bustrackr.dto.admin;

import lombok.Builder;

import java.util.Map;

@Builder
public record AdminDashboardSummaryResponse(
        Map<String,Long> tripsToday,
        Long liveBuses,
        Long availableBuses,
        Long availableDrivers,
        Long pendingRequests
) {
}
