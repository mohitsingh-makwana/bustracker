package com.bustrackr.service.impl;

import com.bustrackr.dto.trips.CreateTripRequest;
import com.bustrackr.dto.trips.TripFullDetailsResponse;
import com.bustrackr.dto.tripschedule.CreateTripScheduleRequest;
import com.bustrackr.dto.tripschedule.TripScheduleFilter;
import com.bustrackr.dto.tripschedule.TripScheduleResponse;
import com.bustrackr.dto.tripschedule.UpdateTripScheduleRequest;
import com.bustrackr.entity.*;
import com.bustrackr.enums.*;
import com.bustrackr.mapper.TripMapper;
import com.bustrackr.repository.*;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.exception.ScheduleOverlappingException;
import com.bustrackr.mapper.TripScheduleMapper;
import com.bustrackr.security.CustomUserDetails;
import com.bustrackr.security.SecurityService;
import com.bustrackr.service.DriverService;
import com.bustrackr.service.TripScheduleService;
import com.bustrackr.service.TripService;
import com.bustrackr.specification.TripScheduleSpecification;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.apache.coyote.BadRequestException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TripScheduleServiceImpl implements TripScheduleService {


    private final TransportSystemRepository transportSystemRepository;
    private final BusRepository busRepository;
    private final RoutePatternRepository routePatternRepository;
    private final DriverRepository driverRepository;
    private final TripScheduleRepository tripScheduleRepository;

    private final TripScheduleMapper tripScheduleMapper;
    private final TripMapper tripMapper;
    private final SecurityService securityService;
    private final TripService tripService;
    private final TripRepository tripRepository;

    private final DriverService driverService;

    @SneakyThrows
    @Override
    @Transactional
    public TripScheduleResponse create(CreateTripScheduleRequest request) {
        Long transportSystemId= securityService.getCurrentTransportSystemId();

        if (!request.scheduledStartTime().isBefore(request.scheduledEndTime())) {
            throw new BadRequestException("Scheduled start time must be before the scheduled end time");
        }

        RoutePattern routePattern = routePatternRepository.findById(request.routePatternId())
                .orElseThrow(() -> new ResourceNotFoundException("RoutePattern not found with id=" + request.routePatternId()));
        TransportSystem transportSystem = transportSystemRepository.findById(transportSystemId)
                .orElseThrow(() -> new ResourceNotFoundException("TransportSystem not available with id=" +transportSystemId));
        Driver driver = driverRepository.findByIdAndStatus(request.driverId(), DriverStatus.AVAILABLE)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not available with id=" + request.driverId()));
        Bus bus = busRepository.findByIdAndStatusAndTransportSystemId(request.busId(), BusStatus.AVAILABLE, transportSystemId)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found with id=" + request.busId()));

        if(isScheduleOverlaps(request,transportSystemId)){
                throw new ScheduleOverlappingException("Schedule is overlapped please do check");
        }

        TripSchedule trip = tripScheduleMapper.toEntity(request);
        trip.setTransportSystem(transportSystem);
        trip.setDriver(driver);
        trip.setRoutePattern(routePattern);
        trip.setBus(bus);
        trip.setScheduleStatus(TripScheduleStatus.ACTIVE);
        return tripScheduleMapper.toResponse(tripScheduleRepository.save(trip));
    }

    private boolean isScheduleOverlaps(CreateTripScheduleRequest request,Long transportSystemId) {

        //Check one done on the basis of driver and bus
        List<TripSchedule> tripSchedules=tripScheduleRepository.findPotentialConflicts(
                transportSystemId,
                request.driverId(),
                request.busId(),
                TripScheduleStatus.ACTIVE);
        List<Trip> trips=tripRepository.findPotentialConflicts(
               transportSystemId,
                request.driverId(),
                request.busId(),
                Set.of(TripStatus.ACTIVE,TripStatus.SCHEDULED));

        //Remaining two checks of day and time conflict
        return hasScheduleConflict(tripSchedules, request.operatingDays(), request.scheduledStartTime(), request.scheduledEndTime())
                || hasTripConflict(trips, request.operatingDays(), request.scheduledStartTime(), request.scheduledEndTime());
    }

    private boolean hasScheduleConflict(
            List<TripSchedule> schedules,
            Set<DayOfWeek> operatingDays,
            LocalTime startTime,
            LocalTime endTime) {

        for (TripSchedule schedule : schedules) {

            boolean commonDay = schedule.getOperatingDays()
                    .stream()
                    .anyMatch(operatingDays::contains);

            boolean timeOverlap =
                    startTime.isBefore(schedule.getScheduledEndTime())
                            && schedule.getScheduledStartTime().isBefore(endTime);

            if (commonDay && timeOverlap) {
                return true;
            }
        }

        return false;
    }
    private boolean hasTripConflict(
            List<Trip> trips,
            Set<DayOfWeek> operatingDays,
            LocalTime startTime,
            LocalTime endTime) {

        for (Trip trip : trips) {

            LocalDate tripDate = trip.getScheduledStartTime().toLocalDate();

            if (!operatingDays.contains(tripDate.getDayOfWeek())) {
                continue;
            }

            LocalDateTime newStart = tripDate.atTime(startTime);
            LocalDateTime newEnd = tripDate.atTime(endTime);

            boolean timeOverlap =
                    newStart.isBefore(trip.getScheduledEndTime())
                            && trip.getScheduledStartTime().isBefore(newEnd);

            if (timeOverlap) {
                return true;
            }
        }

        return false;
    }


    private TripFullDetailsResponse getTripSchedule(Long id,Long transportSystemId) {
        Specification<TripSchedule> spec=Specification.allOf();

        spec=spec.and(TripScheduleSpecification.hasTransportSystemId(transportSystemId));
        spec=spec.and(TripScheduleSpecification.hasId(id));
        spec=spec.and(TripScheduleSpecification.hasStatus(TripScheduleStatus.ACTIVE));

        TripSchedule trip = tripScheduleRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id=" + id));

        return tripScheduleMapper.toFullDetailsResponse(trip);
    }


    @Override
    public TripFullDetailsResponse getPrivateTripSchedule(Long id) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();

        return getTripSchedule(id,customUserDetails.getTransportSystemId());
    }

    @Override
    public TripFullDetailsResponse getPublicTripSchedule(Long id, Long transportSystemId) {
        return getTripSchedule(id,transportSystemId);
    }

    @Override
    public Page<TripFullDetailsResponse> getPrivateTrips(TripScheduleFilter filter, Pageable pageable) {
        CustomUserDetails customUserDetails = securityService.getLoggedInUser();
        Long transportSystemId = customUserDetails.getTransportSystemId();

        return getAllTrips(transportSystemId,filter,pageable);
    }

    @Override
    public Page<TripFullDetailsResponse> getPublicTrips(Long transportSystemId, TripScheduleFilter filter, Pageable pageable) {
        return getAllTrips(transportSystemId,filter,pageable);
    }


    private Page<TripFullDetailsResponse> getAllTrips(Long transportSystemId,TripScheduleFilter filter,Pageable pageable) {

        Specification<TripSchedule> spec=Specification.allOf();
        spec=spec.and(TripScheduleSpecification.hasTransportSystemId(transportSystemId))
                .and(TripScheduleSpecification.hasStatus(TripScheduleStatus.ACTIVE))
                .and(TripScheduleSpecification.hasRoutePatternId(filter.routePatternId()))
                .and(TripScheduleSpecification.hasDriverId(filter.driverId()))
                .and(TripScheduleSpecification.operatesOnDay(filter.day()));

        if(filter.startTime()!=null && filter.endTime()!=null){
            spec=spec.and(TripScheduleSpecification.startsBefore(filter.endTime()))
                    .and(TripScheduleSpecification.endsAfter(filter.startTime()));

        }

        Page<TripSchedule> schedules=tripScheduleRepository.findAll(spec,pageable);


        return schedules.map(tripScheduleMapper::toFullDetailsResponse);
    }


    @Transactional
    @Override
    public TripScheduleResponse update(Long id, UpdateTripScheduleRequest request) {
        TripSchedule trip = tripScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id=" + id));
        tripScheduleMapper.updateEntity(request, trip);

        if (request.driverId() != null) {
            Driver driver = driverRepository.findByIdAndStatus(request.driverId(),
                            DriverStatus.AVAILABLE)
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id=" + request.driverId()));

            trip.setDriver(driver);

        }
        if (request.busId() != null) {
            Bus bus = busRepository.findByIdAndStatusAndTransportSystemId(
                            request.busId(),
                            BusStatus.AVAILABLE,
                            trip.getTransportSystem().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bus not found with id=" + request.busId()));
            trip.setBus(bus);
        }

        return tripScheduleMapper.toResponse(tripScheduleRepository.save(trip));
    }

    @Override
    public void delete(Long id) {
        TripSchedule trip = tripScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id=" + id));
        tripScheduleRepository.delete(trip);
    }

    @Override
    @Transactional
    public Page<TripFullDetailsResponse> getUpcomingTrips(Pageable pageable) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();

        Driver driver=driverService.getLoggedInDriver();
        Long driverId=driver.getId();

        //Regular Trips
        Page<TripSchedule> tripSchedules=tripScheduleRepository.findByDriverIdAndTransportSystemIdAndScheduleStatus(driverId,transportSystemId,TripScheduleStatus.ACTIVE,pageable);

        //Upcoming Single Trips
        // Page<TripResponse> tripResponses=tripService.getMyUpcomingTrips(pageable);

        return tripSchedules.map(tripScheduleMapper::toFullDetailsResponse);
    }

    @Transactional
    @Override
    public TripFullDetailsResponse startTrip(Long id) {
        CustomUserDetails currentDriver=securityService.getLoggedInUser();
        Driver driver=driverService.getLoggedInDriver();
        Long driverId=driver.getId();
        Long transportSystemId=currentDriver.getTransportSystemId();


        TripSchedule trip = tripScheduleRepository.findByIdAndDriverIdAndTransportSystemIdAndScheduleStatus(id,driverId,transportSystemId,TripScheduleStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id=" + id));

        if(!securityService.isCurrentMemberDriver(trip.getDriver().getId())){
            throw new RuntimeException("Requesting Driver is not assigned for this trip");
        }

        //handled above
//        if(trip.getScheduleStatus()==TripScheduleStatus.INACTIVE){
//            throw new BadRequestException("Trip Scheduling is temporarily inactive");
//        }

        CreateTripRequest createTripScheduleRequest=CreateTripRequest.builder()
                .busId(trip.getBus().getId())
                .driverId(trip.getDriver().getId())
                .routePatternId(trip.getRoutePattern().getId())
                .scheduledEndTime(LocalDate.now().atTime(trip.getScheduledEndTime()))
                .scheduledStartTime(LocalDate.now().atTime(trip.getScheduledStartTime()))
                .tripType(TripType.REGULAR)
                .build();

        return tripService.create(createTripScheduleRequest);
    }



}
