package com.bustrackr.dto.passenger;


import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalTime;
@Builder
public record PassengerSearchRequest(
        Long routeId,
        Long stopId,
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime
) {
}
