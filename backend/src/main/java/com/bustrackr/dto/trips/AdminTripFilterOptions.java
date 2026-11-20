package com.bustrackr.dto.trips;

import com.bustrackr.projection.BusFilterDetails;
import com.bustrackr.projection.DriverFilterDetails;
import com.bustrackr.projection.RoutePatternFilterDetails;

import java.util.List;

public record AdminTripFilterOptions(
        List<RoutePatternFilterDetails> routePatterns,
        List<DriverFilterDetails> drivers,
        List<BusFilterDetails> buses
) {
}
