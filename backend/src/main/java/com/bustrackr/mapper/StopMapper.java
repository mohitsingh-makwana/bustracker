package com.bustrackr.mapper;

import com.bustrackr.dto.stop.CreateStopRequest;
import com.bustrackr.dto.stop.StopResponse;
import com.bustrackr.dto.stop.UpdateStopRequest;
import com.bustrackr.entity.Stop;
import com.bustrackr.entity.TransportSystem;
import org.springframework.stereotype.Component;

@Component
public class StopMapper {

    public Stop toEntity(CreateStopRequest request) {
        return Stop.builder()
                .stopCode(request.stopCode())
                .name(request.name())
                .address(request.address())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .build();
    }

    public void updateEntity(UpdateStopRequest request, Stop entity) {

        if (request.stopCode() != null) {
            entity.setStopCode(request.stopCode());
        }

        if (request.name() != null) {
            entity.setName(request.name());
        }

        if (request.address() != null) {
            entity.setAddress(request.address());
        }

        if (request.latitude() != null) {
            entity.setLatitude(request.latitude());
        }

        if (request.longitude() != null) {
            entity.setLongitude(request.longitude());
        }
    }

    public StopResponse toResponse(Stop entity) {

        TransportSystem transportSystem=entity.getTransportSystem();
        return new StopResponse(
                entity.getId(),
                transportSystem.getId(),
                transportSystem.getName(),
                entity.getStopCode(),
                entity.getName(),
                entity.getAddress(),
                entity.getLatitude(),
                entity.getLongitude(),
                entity.getStatus()
        );
    }
}