package com.bustrackr.dto.location;


public record LocationAcceptedEvent(
        Long tripId,
        CreateLocationHistoryRequest request,
        CalculatedLocation calculatedLocation) {
}
