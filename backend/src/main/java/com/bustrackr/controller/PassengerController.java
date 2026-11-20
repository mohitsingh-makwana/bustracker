package com.bustrackr.controller;

import com.bustrackr.dto.passenger.PassengerSearchRequest;
import com.bustrackr.dto.passenger.PassengerSearchResponse;
import com.bustrackr.service.PassengerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/passengers")
@RequiredArgsConstructor
public class PassengerController {
    private final PassengerService passengerService;

    @GetMapping("/search")
    public ResponseEntity<List<PassengerSearchResponse>> search(@ModelAttribute PassengerSearchRequest passengerSearchRequest){
        return ResponseEntity.ok(passengerService.searchPrivateTrips(passengerSearchRequest));
    }

    @GetMapping("/public/search")
    public ResponseEntity<List<PassengerSearchResponse>> searchTrips(@RequestHeader(name="X-Transport-System-Id") Long transportSystemId,
                                                                @ModelAttribute PassengerSearchRequest request
            ) {
        return ResponseEntity.ok(
                passengerService.searchPublicTrips(request,transportSystemId)
        );
    }
}
