package com.bustrackr.dto.routepattern;

import java.util.List;

public record RouteGeometryDto(
        String type,
        List<List<Double>> coordinates
) {
}
