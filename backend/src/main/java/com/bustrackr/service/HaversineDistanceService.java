package com.bustrackr.service;

import org.springframework.stereotype.Service;

@Service
public interface HaversineDistanceService {

    double haversineKm(
            double startLatitude,
            double startLongitude,
            double endLatitude,
            double endLongitude
    );

    double haversineMeters(
            double startLatitude,
            double startLongitude,
            double endLatitude,
            double endLongitude
    );
}
