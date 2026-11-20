package com.bustrackr.mapper;

import com.bustrackr.dto.transportsystem.CreateTransportSystemRequest;
import com.bustrackr.dto.transportsystem.TransportSystemResponse;
import com.bustrackr.dto.transportsystem.UpdateTransportSystemRequest;
import com.bustrackr.entity.TransportSystem;
import org.springframework.stereotype.Component;

@Component
public class TransportSystemMapper {

    public TransportSystem toEntity(CreateTransportSystemRequest request) {

        return TransportSystem.builder()
                .transportCode(request.transportCode())
                .name(request.name())
                .description(request.description())
                .accessType(request.accessType())
                .city(request.city())
                .area(request.area())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .build();
    }

    public void updateEntity(UpdateTransportSystemRequest request, TransportSystem entity) {

        if (request.transportCode() != null) {
            entity.setTransportCode(request.transportCode());
        }

        if (request.name() != null) {
            entity.setName(request.name());
        }

        if (request.description() != null) {
            entity.setDescription(request.description());
        }

        if (request.accessType() != null) {
            entity.setAccessType(request.accessType());
        }

        if (request.city() != null) {
            entity.setCity(request.city());
        }

        if (request.area() != null) {
            entity.setArea(request.area());
        }

        if (request.latitude() != null) {
            entity.setLatitude(request.latitude());
        }

        if (request.longitude() != null) {
            entity.setLongitude(request.longitude());
        }
    }

    public TransportSystemResponse toResponse(TransportSystem entity) {

        return new TransportSystemResponse(
                entity.getId(),
                entity.getTransportCode(),
                entity.getName(),
                entity.getDescription(),
                entity.getAccessType(),
                entity.getCity(),
                entity.getArea(),
                entity.getLatitude(),
                entity.getLongitude(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}