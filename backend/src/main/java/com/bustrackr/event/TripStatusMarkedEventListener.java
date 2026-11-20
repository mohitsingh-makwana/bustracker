package com.bustrackr.event;

import com.bustrackr.dto.location.TripStatusEvent;
import com.bustrackr.service.LiveLocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class TripStatusMarkedEventListener {

    private final LiveLocationService liveLocationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleTripStatusMarkedEvent(TripStatusEvent event){
        liveLocationService.delegateTripStatus(event);
    }
}
