package com.bustrackr.service;

import com.bustrackr.dto.passenger.PassengerSearchRequest;
import com.bustrackr.dto.passenger.PassengerSearchResponse;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface PassengerService {
    List<PassengerSearchResponse> searchPrivateTrips(PassengerSearchRequest passengerSearchRequest);

    List<PassengerSearchResponse> searchPublicTrips(PassengerSearchRequest request, Long transportSystemId);
}
