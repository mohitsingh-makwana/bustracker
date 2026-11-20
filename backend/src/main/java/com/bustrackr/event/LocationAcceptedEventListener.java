package com.bustrackr.event;

import com.bustrackr.dto.location.LocationAcceptedEvent;
import com.bustrackr.service.LiveLocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class LocationAcceptedEventListener {

    private final LiveLocationService liveLocationService;


    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleLocationAccepted(LocationAcceptedEvent event) {

        liveLocationService.updateLatestLocation(
                event.request(),
                event.tripId(),
                event.calculatedLocation()
        );
    }
}