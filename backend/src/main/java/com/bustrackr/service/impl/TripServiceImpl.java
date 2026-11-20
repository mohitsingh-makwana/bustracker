package com.bustrackr.service.impl;

import com.bustrackr.dto.location.*;
import com.bustrackr.dto.patternstop.PatternStopResponse;
import com.bustrackr.dto.routepattern.RouteStopCoordinate;
import com.bustrackr.dto.trips.*;
import com.bustrackr.entity.*;
import com.bustrackr.enums.*;
import com.bustrackr.event.TripStatusMarkedEventListener;
import com.bustrackr.exception.*;
import com.bustrackr.projection.*;
import com.bustrackr.repository.*;
import com.bustrackr.mapper.PatternStopMapper;
import com.bustrackr.mapper.TripMapper;
import com.bustrackr.security.CustomUserDetails;
import com.bustrackr.security.SecurityService;
import com.bustrackr.service.*;
import com.bustrackr.specification.TripSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@Slf4j
@RequiredArgsConstructor
public class TripServiceImpl implements TripService {

    private final TripRepository tripRepository;
    private final SecurityService securityService;
    private final RoutePatternRepository routePatternRepository;
    private final RouteRepository routeRepository;
    private final DriverRepository driverRepository;
    private final TransportSystemRepository transportSystemRepository;
    private final BusRepository busRepository;
    private final PatternStopRepository patternStopRepository;
    private final TripScheduleRepository tripScheduleRepository;
    private final TransportMemberRepository transportMemberRepository;
    private final StopRepository stopRepository;

    private final TripMapper tripMapper;
    private final PatternStopMapper patternStopMapper;


    private final DriverService driverService;
    private final LocationHistoryService locationHistoryService;
    private final LiveLocationService liveLocationService;

    private final TripRouteMetadataService tripRouteMetadataService;
    private final TripStatusMarkedEventListener tripStatusMarkedEventListener;

    @Override
    @Transactional
    public TripFullDetailsResponse create(CreateTripRequest request) {

        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();

        Trip trip=tripMapper.toEntity(request);
        if (!request.scheduledStartTime().isBefore(request.scheduledEndTime())) {
            throw new InvalidRequestException("Scheduled start time must be before the scheduled end time");
        }

        RoutePattern routePattern = routePatternRepository.findById(request.routePatternId())
                .orElseThrow(() -> new ResourceNotFoundException("RoutePattern not found with id=" + request.routePatternId()));
        TransportSystem transportSystem = transportSystemRepository.findById(transportSystemId)
                .orElseThrow(() -> new ResourceNotFoundException("TransportSystem not available with id=" + transportSystemId));
        Driver driver = driverRepository.findByIdAndStatus(request.driverId(), DriverStatus.AVAILABLE)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not available with id=" + request.driverId()));
        Bus bus = busRepository.findByIdAndStatusAndTransportSystemId(request.busId(), BusStatus.AVAILABLE, transportSystemId)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found with id=" + request.busId()));

        trip.setRoutePattern(routePattern);
        trip.setBus(bus);
        trip.setDriver(driver);
        trip.setTransportSystem(transportSystem);

       if(request.tripType()==TripType.SINGLE){   //Requested Trip Type is Single So only trip Scheduling no start

           if(isScheduleOverlap(request,transportSystemId)){
               throw new ScheduleOverlappingException("Schedule overlaps please check and re-schedule");
           }

           trip.setTripType(TripType.SINGLE);
           trip.setStatus(TripStatus.SCHEDULED);
       }
       else{                            //Requested Trip Type is Regular So creating and starting the trip
           trip.setTripType(TripType.REGULAR);
           trip.setStatus(TripStatus.ACTIVE);
           trip.setActualStartTime(LocalDateTime.now());

           //Checking drivers are available or not before starting the regular trip
           if(driver.getStatus() != DriverStatus.AVAILABLE) {
               throw new ResourceNotAvailableException("Driver not available for trip with id="+trip.getDriver().getId());
           }
           if(bus.getStatus() != BusStatus.AVAILABLE){
               throw new ResourceNotAvailableException("Bus not available for trip with id="+trip.getBus().getId());
           }

           driver.setStatus(DriverStatus.ON_TRIP);// Changing the Driver Status
           bus.setStatus(BusStatus.IN_USE);    // Setting the Bus Status


           //Scheduled trip is now started so storing trip metadata but trip is not saved yet
           TripRouteMetadata metadata = getMetadata(trip);

           tripRouteMetadataService.createMetadata(
                   trip.getId(),
                   metadata
           );

           log.info("request={} entity={}", request.scheduledStartTime(), trip.getScheduledStartTime());
           trip = tripRepository.saveAndFlush(trip);
           log.info("after save={}", trip.getScheduledStartTime());

       }
        return tripMapper.toFullDetailsResponse(tripRepository.save(trip));
    }

    private boolean isScheduleOverlap(CreateTripRequest request,Long transportSystemId) {
        List<TripSchedule> tripSchedules=tripScheduleRepository.findPotentialConflicts(
               transportSystemId,
                request.driverId(),
                request.busId(),
                TripScheduleStatus.ACTIVE
        );
        List<Trip> trips=tripRepository.findPotentialConflicts(
               transportSystemId,
                request.driverId(),
                request.busId(),
                Set.of(TripStatus.ACTIVE,TripStatus.SCHEDULED)
        );

        return hasScheduleOverlap(tripSchedules,request.scheduledStartTime(),request.scheduledEndTime())
                || hasTripOverlap(trips,request.scheduledStartTime(),request.scheduledEndTime());
    }

    private boolean hasTripOverlap(List<Trip> existingTrips,  LocalDateTime startTime, LocalDateTime endTime) {
        
        for(Trip trip: existingTrips){

            boolean timeOverlap =startTime.isBefore(trip.getScheduledEndTime())
                    && trip.getScheduledStartTime().isBefore(endTime);
            if(timeOverlap)
                return true;
        }
        return false;
    }

    private boolean hasScheduleOverlap(List<TripSchedule> existingSchedules, LocalDateTime startTime, LocalDateTime endTime) {

        for(TripSchedule tripSchedule:existingSchedules){
            LocalDate localDate=startTime.toLocalDate();//extracted new trip date

            //here if date not matches with the new trip date then no need to check time
            if(!tripSchedule.getOperatingDays().contains(localDate.getDayOfWeek())){
                continue;
            }

            LocalTime newStartTime=startTime.toLocalTime();//extracting start time
            LocalTime newEndTime=endTime.toLocalTime();    //extracting end time

            boolean timeOverlap =newStartTime.isBefore(tripSchedule.getScheduledEndTime())
                    && tripSchedule.getScheduledStartTime().isBefore(newEndTime);
            if(timeOverlap)
                return true;
        }
        return false;
    }



    @Override
    public TripFullDetailsResponse getPrivateTrip(Long id) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();

        return tripMapper.toFullDetailsResponse(getTrip(transportSystemId,id));
    }


    private Trip getTrip(Long transportSystemId, Long tripId) {
        Specification<Trip> spec = Specification.allOf();
        spec = spec.and(TripSpecification.hasId(tripId));
        spec = spec.and(
                TripSpecification.hasTransportSystemId(transportSystemId)
        );

        return tripRepository.findOne(spec).orElseThrow(() -> new ResourceNotFoundException("Trip not found with id=" + tripId));
    }


        @Override
    public TripFullDetailsResponse getPublicTrip(Long transportSystemId, Long tripId) {
              return tripMapper.toFullDetailsResponse(getTrip(transportSystemId,tripId));
    }

    @Override
    public LocationHistoryResponse updateLocation(UpdateLocationRequest request, Long tripId) {

        log.info("Reached in updateLocation Method.....");

        return locationHistoryService.create(
                CreateLocationHistoryRequest.builder()
                        .tripId(tripId)
                        .latitude(request.latitude())
                        .longitude(request.longitude())
                        .accuracyMeters(request.accuracyMeters())
                        .recordedAt(request.recordedAt())
                        .speed(request.speedMetersPerSecond())
                        .nextPatternStopId(request.nextPatternStopId())
                        .build()
        );
    }

    @Override
    public Optional<LiveLocationResponse> getPublicLiveLocation(Long transportSystemId, Long tripId) {
        return getLiveLocation(transportSystemId,tripId);
    }

    @Override
    public Optional<LiveLocationResponse> getPrivateLiveLocation(Long tripId) {
        if(securityService.hasNoAuthentication()) throw new RuntimeException("No Active Authentication");
        User user=securityService.getLoggedInUser().getUser();
        if(!transportMemberRepository.existsByUserIdAndTransportSystemIdAndStatus(user.getId(), securityService.getCurrentTransportSystemId(), TransportMemberStatus.ACTIVE))
            throw new NoActiveTransportMemberException("Not an Active member with user id="+user.getId());

        return getLiveLocation(securityService.getCurrentTransportSystemId(),tripId);
    }


    @Transactional
    private Optional<LiveLocationResponse>   getLiveLocation(Long transportSystemId, Long tripId) {
        Specification<Trip> spec=Specification.allOf();
        spec=spec.and(TripSpecification.hasId(tripId));
        spec=spec.and(TripSpecification.hasTransportSystemId(transportSystemId));

        log.info("finding trip with trip id ={} and Transport System id={}",tripId,transportSystemId);

        Trip trip=tripRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id="+tripId));
        if(!trip.getStatus().name().equals(TripStatus.ACTIVE.name())){
            throw new RuntimeException("Trip is not active with id="+tripId);
        }
        log.info("found trip with trip id ={} and Transport System id={}",tripId,transportSystemId);


        return liveLocationService.getLatestLocation(tripId);
    }

    @Override
    public void delete(Long id) {
        Specification<Trip> spec=Specification.allOf();
        spec=spec.and(TripSpecification.hasId(id));
        spec=spec.and(TripSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));

        Trip trip=tripRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id="+id));
        tripRepository.delete(trip);
    }

    @Transactional
    @Override
    public TripFullDetailsResponse start(Long id) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();

        log.info("finding the trip with id ={}",id);

        Trip trip=tripRepository.findByIdAndTransportSystemIdAndStatus(id,transportSystemId,TripStatus.SCHEDULED)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id="+id+" transport system id="+transportSystemId));
        log.info("found the trip with id ={}",id);

        trip.setStatus(TripStatus.ACTIVE);
        trip.setActualStartTime(LocalDateTime.now());

        Driver driver=trip.getDriver();
        Bus bus=trip.getBus();

        if(driver.getStatus() != DriverStatus.AVAILABLE) {
            throw new ResourceNotAvailableException("Driver not available for trip with id="+driver.getId());
        }
            if(bus.getStatus() != BusStatus.AVAILABLE){
            throw new ResourceNotAvailableException("Bus not available for trip with id="+bus.getId());
        }
        log.info("driver is available ");

        driver.setStatus(DriverStatus.ON_TRIP);// Changing the Driver Status
        bus.setStatus(BusStatus.IN_USE);    // Changing the Bus Status

        //Single trip is now started so storing trip metadata
        TripRouteMetadata metadata = getMetadata(trip);

        log.info("Metadata calculated ={}",metadata);

        tripRouteMetadataService.createMetadata(
                trip.getId(),
                metadata
        );

        return tripMapper.toFullDetailsResponse(tripRepository.save(trip));
    }
    private @NonNull TripRouteMetadata getMetadata(Trip trip) {
        RoutePattern routePattern= trip.getRoutePattern();
        Stop destination=routePattern.getDestination();

        List<RouteStopCoordinate> tripStopsCoordinates=patternStopRepository.findStopByRoutePatternId(routePattern.getId());

        //Single trip is now started so storing trip metadata
        return new TripRouteMetadata(
                routePattern.getId(),
                destination.getId(),
                destination.getLatitude(),
                destination.getLongitude(),
                routePattern.getTotalDistanceMeters(),
                tripStopsCoordinates,
                0.0
        );
    }



    private Page<TripFullDetailsResponse> getTransportSystemTrips(Long transportSystemId,TripFilter filter,Pageable pageable) {

        Specification<Trip> spec=Specification.allOf();
        spec=spec.and(TripSpecification.hasTransportSystemId(transportSystemId));


        if(filter!=null) {
            if(filter.busId()!=null){
                spec=spec.and(TripSpecification.hasBusId(filter.busId()));
            }
            if (filter.driverId() != null) {
                spec = spec.and(TripSpecification.hasDriverId(filter.driverId()));
            }
            if (filter.routePatternId() != null) {
                spec = spec.and(TripSpecification.hasRoutePatternId(filter.routePatternId()));
            }
            if (filter.status() != null && !filter.status().name().equals(TripStatusFilter.ALL.name())) {
                spec = spec.and(TripSpecification.hasStatus(TripStatus.valueOf(filter.status().name())));
            }

            if (filter.date() != null) {
                if (filter.startTime() != null && filter.endTime() != null) {
                    spec = spec.and(TripSpecification.hasDateTimeRange(filter.date(), filter.startTime(), filter.endTime()));
                } else {
                    spec = spec.and(TripSpecification.hasScheduledDate(filter.date()));
                }
            } else if (filter.startTime() != null && filter.endTime() != null) {

                if (filter.endTime().isBefore(filter.startTime())) {
                    throw new InvalidRequestException("Wrong time filter applied");
                }
                spec = spec.and(TripSpecification.hasDateTimeRange(LocalDate.now(), filter.startTime(), filter.endTime()));
            }
        }


        Page<Trip> trips=tripRepository.findAll(spec,pageable);

        return trips.map(tripMapper::toFullDetailsResponse);
    }

    @Override
    public Page<TripFullDetailsResponse> getPrivateTransportSystemTrips(TripFilter filter,int page,int size) {
        Long transportSystemId = securityService.getCurrentTransportSystemId();
        Pageable pageable= PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC,"scheduledStartTime")
        );
        return getTransportSystemTrips(transportSystemId,filter,pageable);
    }

    @Override
    public Page<TripFullDetailsResponse> getPublicTransportSystemTrips(Long transportSystemId, TripFilter filter,int page,int size) {
        Pageable pageable= PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC,"scheduled_start_time")
        );
        return getTransportSystemTrips(transportSystemId,filter,pageable);
    }


    @Transactional
    @Override
    public TripResponse markTripComplete(Long id) {
        CustomUserDetails currentUser=securityService.getLoggedInUser();
        Long transportSystemId=currentUser.getTransportSystemId();

        Driver driver=driverService.getLoggedInDriver();
        Long driverId=driver.getId();

        Trip trip=tripRepository.findByIdAndDriverIdAndTransportSystemIdAndStatus(id,driverId,transportSystemId,TripStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with driver id and active="+driverId));

        //Just For concurrent Updates
        Driver driver1=driverRepository.findByIdAndStatus(driverId,DriverStatus.ON_TRIP)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with driver id ="+driverId));
        Bus bus1=busRepository.findByIdAndStatusAndTransportSystemId(trip.getBus().getId(),BusStatus.IN_USE,transportSystemId)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found with Bus id ="+trip.getBus().getId()));

        trip.setStatus(TripStatus.COMPLETED); // Changing the trip status to Complete
        trip.setActualEndTime(LocalDateTime.now());  // marking the trip end date
        driver1.setStatus(DriverStatus.AVAILABLE);// Changing the Driver Status
        bus1.setStatus(BusStatus.AVAILABLE);    // Setting the Bus Status

        TripRouteMetadata metadata=tripRouteMetadataService.getMetadata(id)
                        .orElseThrow(() -> new ResourceNotFoundException("Metadata not found for the trip ="+id));
        trip.setDistanceKm(metadata.totalDistanceTravelled());

        tripRepository.save(trip);
        tripStatusMarkedEventListener.handleTripStatusMarkedEvent(
                new TripStatusEvent(trip.getId(),TripStatus.COMPLETED, Instant.now())
        );


        return tripMapper.toResponse(trip);
    }
    @Transactional()
    private List<PatternStopResponse> getStops(Long id,Long transportSystemId) {

        Specification<Trip> spec=Specification.allOf();
        spec=spec.and(TripSpecification.hasId(id));
        spec=spec.and(TripSpecification.hasTransportSystemId(transportSystemId));

        Trip trip=tripRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id="+id));
        Long routePatternId=trip.getRoutePattern().getId();

        List<PatternStop> patternStops =
                patternStopRepository
                        .findByRoutePatternIdOrderBySequenceAsc(routePatternId);

        return patternStops.stream().map(patternStopMapper::toResponse).toList();
    }


    @Override
    public List<PatternStopResponse> getPrivateStops(Long id) {
        Long transportSystemId= securityService.getCurrentTransportSystemId();

        return getStops(id,transportSystemId);
    }

    @Override
    public List<PatternStopResponse> getPublicStops(Long id, Long transportSystemId) {
        return getStops(id,transportSystemId);
    }


    @Transactional(readOnly = true)
    private PatternStopResponse getNextStop(Long id, Long sequence,Long transportSystemId) {
        Specification<Trip> spec=Specification.allOf();
        spec=spec.and(TripSpecification.hasId(id));
        spec=spec.and(TripSpecification.hasTransportSystemId(transportSystemId));

        Trip trip=tripRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id="+id));
        Long routePatternId=trip.getRoutePattern().getId();

        PatternStop patternStop=patternStopRepository.findByRoutePatternIdAndSequence(routePatternId,sequence);

        return patternStopMapper.toResponse(patternStop);
    }

    @Override
    public PatternStopResponse getNextPrivateStop(Long id, Long sequence) {
        Long transportSystemId=securityService.getCurrentTransportSystemId();

        return getNextStop(id,sequence,transportSystemId);
    }

    @Override
    public PatternStopResponse getNextPublicStop(Long id, Long sequence, Long transportSystemId) {
        return getNextStop(id,sequence,transportSystemId);
    }

    @Override
    public AdminTripFilterOptions getAdminFilterOptions() {

        log.info("fetching data for filtering ");
        Long transportSystemId=securityService.getCurrentTransportSystemId();

        List<Long> routeIds=routeRepository.findIdByTransportSystemId(transportSystemId);
        List<Long> memberIds=transportMemberRepository.getIdByTransportSystemIdAndRoleAndActive(transportSystemId,TransportMemberRole.ROLE_DRIVER,true);

        List<RoutePatternFilterDetails> routePatterns=routePatternRepository.getRoutePatternFilterByTransportSystemId(routeIds,true);
        List<DriverFilterDetails> drivers=driverRepository.getDriverFilterByTransportSystemId(memberIds);
        List<BusFilterDetails> buses=busRepository.getBusFilterByTransportSystemId(transportSystemId);
        log.info("returning data for filtering");

        return new AdminTripFilterOptions(routePatterns,drivers,buses);
    }

    private PassengerTripFilterOptions getPassengerFilterOptions(Long transportSystemId) {
        List<RouteFilterDetails> routes=routeRepository.getTransportSystemRoutes(transportSystemId,RouteStatus.ACTIVE,true);
        List<StopFilterDetails> stops=stopRepository.getTransportSystemStops(transportSystemId,StopStatus.ACTIVE,true);
        return new PassengerTripFilterOptions(routes,stops);
    }

    @Override
    public PassengerTripFilterOptions getPublicPassengerFilterOptions(Long transportSystemId) {
        return getPassengerFilterOptions(transportSystemId);
    }

    @Override
    public PassengerTripFilterOptions getPrivatePassengerFilterOptions() {
        return getPassengerFilterOptions(securityService.getCurrentTransportSystemId());
    }

    @Override
    public List<LiveBusLocationDto> getLiveBusesCoordinates() {

        List<Long> tripIds=tripRepository.getIdByTransportSystemIdAndStatus(securityService.getCurrentTransportSystemId(), TripStatus.ACTIVE);
        return liveLocationService.getLiveBusLocations(tripIds);
    }

    @Override
    @Transactional
    public TripResponse cancelScheduledTrip(Long id) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();

        Trip trip=tripRepository.findByIdAndTransportSystemIdAndStatus(id,transportSystemId,TripStatus.SCHEDULED)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id="+id+" and transportid="+transportSystemId));


        trip.setStatus(TripStatus.CANCELLED);

        trip.getBus().setStatus(BusStatus.AVAILABLE);
        trip.getDriver().setStatus(DriverStatus.AVAILABLE);

        tripRepository.save(trip);

        return tripMapper.toResponse(trip);
    }


    @Override
    @Transactional
    public TripResponse terminateActiveTrip(Long id) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Driver driver=driverService.getLoggedInDriver();
        Long driverId=driver.getId();

        Long transportSystemId=customUserDetails.getTransportSystemId();

        Trip trip=tripRepository.findByDriverIdAndTransportSystemIdAndStatus(driverId,transportSystemId,TripStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with driver id ="+driverId+" and transportid="+transportSystemId));

        //Just For concurrent Updates
        Driver driver1=driverRepository.findByIdAndStatus(driverId,DriverStatus.ON_TRIP)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with driver id ="+driverId));
        Bus bus1=busRepository.findByIdAndStatusAndTransportSystemId(trip.getBus().getId(),BusStatus.IN_USE,transportSystemId)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found with Bus id ="+trip.getBus().getId()));

        trip.setStatus(TripStatus.TERMINATED); // Changing the trip status to Complete
        trip.setActualEndTime(LocalDateTime.now());  // marking the trip end date
        driver1.setStatus(DriverStatus.AVAILABLE);// Changing the Driver Status
        bus1.setStatus(BusStatus.AVAILABLE);    // Setting the Bus Status


        TripRouteMetadata metadata=tripRouteMetadataService.getMetadata(id)
                .orElseThrow(() -> new ResourceNotFoundException("Metadata not found for the trip ="+id));
        trip.setDistanceKm(metadata.totalDistanceTravelled());

        tripRepository.save(trip);

        tripStatusMarkedEventListener.handleTripStatusMarkedEvent(
                new TripStatusEvent(trip.getId(),TripStatus.TERMINATED, Instant.now())
        );

        return tripMapper.toResponse(trip);
    }



    @Override
    @Transactional
    public TripFullDetailsResponse getMyCurrentTrip() {
         Driver driver=driverService.getLoggedInDriver();
        Long driverId=driver.getId();
        Long transportSystemId= securityService.getCurrentTransportSystemId();

        Trip trip=tripRepository.findByDriverIdAndTransportSystemIdAndStatus(driverId,transportSystemId,TripStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with driver id="+driverId+" and active"));

        return tripMapper.toFullDetailsResponse(trip);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TripFullDetailsResponse> getMyUpcomingTrips(Pageable pageable) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Driver driver=driverService.getLoggedInDriver();
        Long driverId=driver.getId();
        Long transportSystemId=customUserDetails.getTransportSystemId();

        Page<Trip> trips=tripRepository.findPageByDriverIdAndTransportSystemIdAndStatus(driverId,transportSystemId,TripStatus.SCHEDULED,pageable);

        return trips.map(tripMapper::toFullDetailsResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TripFullDetailsResponse> getMyTripHistory(Pageable pageable) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Driver driver=driverService.getLoggedInDriver();
        Long driverId=driver.getId();
        Long transportSystemId=customUserDetails.getTransportSystemId();

        Page<Trip> trips=tripRepository.getTripByDriverIdAndTransportSystemIdAndStatusIn(driverId,transportSystemId, List.of(TripStatus.CANCELLED,TripStatus.COMPLETED,TripStatus.TERMINATED),pageable);

        return trips.map(tripMapper::toFullDetailsResponse);
    }


}
