package com.bustrackr.mapper;

import com.bustrackr.dto.bus.BusResponse;
import com.bustrackr.dto.bus.CreateBusRequest;
import com.bustrackr.dto.bus.UpdateBusRequest;
import com.bustrackr.entity.Bus;
import com.bustrackr.entity.TransportSystem;
import org.springframework.stereotype.Component;

@Component
public class BusMapper {

    public Bus toEntity(CreateBusRequest request) {
        return Bus.builder()
                .busNumber(request.busNumber())
                .registrationNumber(request.registrationNumber())
                .model(request.model())
                .capacity(request.capacity())
                .lastServiceDate(request.lastServiceDate())
                .nextServiceDate(request.nextServiceDate())
                .build();
    }

    public void updateEntity(UpdateBusRequest request, Bus entity) {

        if (request.busNumber() != null) {
            entity.setBusNumber(request.busNumber());
        }

        if (request.registrationNumber() != null) {
            entity.setRegistrationNumber(request.registrationNumber());
        }

        if (request.model() != null) {
            entity.setModel(request.model());
        }

        if (request.capacity() != null) {
            entity.setCapacity(request.capacity());
        }

        if (request.lastServiceDate() != null) {
            entity.setLastServiceDate(request.lastServiceDate());
        }

        if (request.nextServiceDate() != null) {
            entity.setNextServiceDate(request.nextServiceDate());
        }
        if (request.status() != null) {
            entity.setStatus(request.status());
        }
    }

    public BusResponse toResponse(Bus entity) {
        TransportSystem transportSystem=entity.getTransportSystem();
        return new BusResponse(
                entity.getId(),
                transportSystem.getId(),
                transportSystem.getName(),
                entity.getBusNumber(),
                entity.getRegistrationNumber(),
                entity.getModel(),
                entity.getCapacity(),
                entity.getStatus(),
                entity.getLastServiceDate(),
                entity.getNextServiceDate(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}