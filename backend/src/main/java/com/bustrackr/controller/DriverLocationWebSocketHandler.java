package com.bustrackr.controller;

import com.bustrackr.dto.location.UpdateLocationRequest;
import com.bustrackr.service.TripService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
@Slf4j
public class DriverLocationWebSocketHandler {

    private final TripService tripService;

    @MessageMapping("/trips/{tripId}/locations")
    public void updateDriverLocation(Principal principal,
                                     @DestinationVariable Long tripId,
                                     UpdateLocationRequest request
    ) {

        log.info(principal.getName());
        Authentication authentication=SecurityContextHolder.getContext().getAuthentication();


        log.info("Authentication={}",authentication!=null?authentication.isAuthenticated():"null");

        tripService.updateLocation(request, tripId);
    }


    @MessageExceptionHandler
    public void handle(Exception ex) {
        log.error("WS handler failed", ex);
    }
}