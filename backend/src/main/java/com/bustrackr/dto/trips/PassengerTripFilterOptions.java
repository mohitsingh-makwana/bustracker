package com.bustrackr.dto.trips;

import com.bustrackr.projection.RouteFilterDetails;
import com.bustrackr.projection.StopFilterDetails;

import java.util.List;

public record PassengerTripFilterOptions(
    List<RouteFilterDetails> routes,
    List<StopFilterDetails> stops
) {
}
