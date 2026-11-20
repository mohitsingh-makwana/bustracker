package com.bustrackr.service.impl;

import com.bustrackr.dto.bus.BusFilterRequest;
import com.bustrackr.dto.bus.BusResponse;
import com.bustrackr.dto.bus.CreateBusRequest;
import com.bustrackr.dto.bus.UpdateBusRequest;
import com.bustrackr.entity.Bus;
import com.bustrackr.entity.TransportSystem;
import com.bustrackr.entity.Trip;
import com.bustrackr.entity.TripSchedule;
import com.bustrackr.enums.BusStatus;
import com.bustrackr.enums.BusStatusFilter;
import com.bustrackr.enums.TripScheduleStatus;
import com.bustrackr.enums.TripStatus;
import com.bustrackr.exception.InvalidRequestException;
import com.bustrackr.exception.ResourceAlreadyExistException;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.mapper.BusMapper;
import com.bustrackr.repository.BusRepository;
import com.bustrackr.repository.TransportSystemRepository;
import com.bustrackr.repository.TripRepository;
import com.bustrackr.repository.TripScheduleRepository;
import com.bustrackr.security.SecurityService;
import com.bustrackr.service.BusService;
import com.bustrackr.specification.BusSpecification;
import com.bustrackr.specification.TripScheduleSpecification;
import com.bustrackr.specification.TripSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BusServiceImpl implements BusService {

    private final BusRepository busRepository;
    private final TransportSystemRepository transportSystemRepository;
    private final TripRepository tripRepository;
    private final TripScheduleRepository tripScheduleRepository;

    private final BusMapper mapper;
    private final SecurityService securityService;

    @Override
    @Transactional
    public BusResponse create(CreateBusRequest request) {

        Long transportSystemId =
                securityService.getCurrentTransportSystemId();

        Specification<Bus> specification=Specification.allOf();
        specification=specification.and(BusSpecification.hasBusNumber(request.busNumber()));
        specification=specification.and(BusSpecification.hasTransportSystemId(transportSystemId));
        specification=specification.and(BusSpecification.hasRegistrationNumber(request.registrationNumber()));
        specification=specification.and(BusSpecification.hasModel(request.model()));

        LocalDateTime now = LocalDateTime.now();

        // Check whether a bus with this number already exists,
        // regardless of its active status.
        Optional<Bus> existingBus =
                busRepository.findOne(specification);

        Bus bus;

        if (existingBus.isPresent()) {
            bus = existingBus.get();

            // Prevent duplicate creation of an already-active bus.
            if (bus.getActive()) {
                throw new ResourceAlreadyExistException(
                        "Bus already exists with bus number: "
                                + request.busNumber()
                );
            }
            else {
                throw new ResourceAlreadyExistException(
                        "Bus already exists with bus number but it is deleted (inactive): "
                                + request.busNumber()
                );
            }
        } else {
            // Create a genuinely new bus.
            bus = mapper.toEntity(request);

            TransportSystem transportSystem = transportSystemRepository.findById(transportSystemId)
                            .orElseThrow(() -> new ResourceNotFoundException("TransportSystem not found with id=" + transportSystemId));

            bus.setTransportSystem(transportSystem);
            bus.setActive(true);
            bus.setStatus(BusStatus.AVAILABLE);
            bus.setCreatedAt(now);
            bus.setUpdatedAt(now);
        }

        return mapper.toResponse(busRepository.save(bus));
    }

    @Override
    public BusResponse getById(Long id) {
        Specification<Bus> specification=Specification.allOf();
        specification=specification.and(BusSpecification.hasId(id));
        specification=specification.and(BusSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));
        specification=specification.and(BusSpecification.isActive(true));
        Bus bus=busRepository.findOne(specification)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found with id="+id));

        return mapper.toResponse(busRepository.save(bus));
    }

    @Override
    public Page<BusResponse> getAllTransportSystemBuses(Pageable pageable, BusFilterRequest request) {

        Specification<Bus> spec=Specification.allOf();
        spec=spec.and(BusSpecification.isActive(true));
        if(request.status() != null && request.status()!= BusStatusFilter.ALL){
            spec=spec.and(BusSpecification.hasStatus(BusStatus.valueOf(request.status().name())));
        }
        if(request.model() != null){
            spec=spec.and(BusSpecification.hasModel(request.model()));
        }
        if(request.busNumber() != null){
            spec=spec.and(BusSpecification.hasBusNumberLike(request.busNumber()));
        }
        if(request.registrationNumber() != null){
            spec=spec.and(BusSpecification.hasRegistrationNumber(request.registrationNumber()));
        }
        if(request.nextServiceDate() != null){
            spec=spec.and(BusSpecification.hasNextServiceDate(request.nextServiceDate()));
        }
        if(request.lastServiceDate() != null){
            spec=spec.and(BusSpecification.hasLastServiceDate(request.lastServiceDate()));
        }
            spec=spec.and(BusSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));

        Page<Bus> buses=busRepository.findAll(spec,pageable);

        return buses.map(mapper::toResponse);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Specification<Trip> triSpec=Specification.allOf();
        triSpec=triSpec.and(TripSpecification.hasBusId(id));
        triSpec=triSpec.and(TripSpecification.hasStatus(TripStatus.SCHEDULED).or(TripSpecification.hasStatus(TripStatus.ACTIVE)));

        Specification<TripSchedule> tripScheduleSpecification=Specification.allOf();
        tripScheduleSpecification=tripScheduleSpecification.and(TripScheduleSpecification.hasBusId(id));
        tripScheduleSpecification=tripScheduleSpecification.and(TripScheduleSpecification.hasStatus(TripScheduleStatus.ACTIVE));

        if(tripRepository.exists(triSpec) || tripScheduleRepository.exists(tripScheduleSpecification)){
            throw new InvalidRequestException("You can't delete the Driver as he is on duty");
        }

        Specification<Bus> spec=Specification.allOf();
        spec=spec.and(BusSpecification.hasId(id));
        spec=spec.and(BusSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));

        Bus bus=busRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found with id="+id));
        if(bus.getActive()){
            throw new IllegalStateException("Bus is already deleted");
        }

        bus.setActive(false);

        }

    @Override
    public BusResponse update(Long id, UpdateBusRequest request) {
        Specification<Bus> spec=Specification.allOf();
        spec=spec.and(BusSpecification.hasId(id));
        spec=spec.and(BusSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));
        spec=spec.and(BusSpecification.isActive(true));

        Bus bus=busRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found with id="+id));
        mapper.updateEntity(request,bus);

        return mapper.toResponse(busRepository.save(bus));
    }
    
}
