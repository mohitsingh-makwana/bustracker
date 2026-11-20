package com.bustrackr.service.impl;

import com.bustrackr.service.HaversineDistanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HaversineDistanceServiceImpl implements HaversineDistanceService {

    private static final double EARTH_RADIUS_KM = 6371.0088;

    @Override
    public double haversineKm(double startLatitude, double startLongitude, double endLatitude, double endLongitude) {
        double dLat = Math.toRadians(endLatitude - startLatitude);
        double dLon = Math.toRadians(endLongitude - startLongitude);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(startLatitude)) * Math.cos(Math.toRadians(endLatitude))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        // Handle floating-point precision errors
        a = Math.clamp(a, 0.0, 1.0);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return EARTH_RADIUS_KM * c;

    }

    @Override
    public double haversineMeters(double startLatitude, double startLongitude, double endLatitude, double endLongitude) {
        return haversineKm(startLatitude, startLongitude, endLatitude, endLongitude) * 1000.0;
    }
}
