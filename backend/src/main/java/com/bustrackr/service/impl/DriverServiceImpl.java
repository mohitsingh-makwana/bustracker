package com.bustrackr.service.impl;

import com.bustrackr.dto.driver.CreateDriverRequest;
import com.bustrackr.dto.driver.DriverFilter;
import com.bustrackr.dto.driver.DriverResponse;
import com.bustrackr.dto.driver.UpdateDriverRequest;
import com.bustrackr.entity.Driver;
import com.bustrackr.entity.TransportMember;
import com.bustrackr.entity.Trip;
import com.bustrackr.entity.TripSchedule;
import com.bustrackr.enums.*;
import com.bustrackr.exception.*;
import com.bustrackr.mapper.DriverMapper;
import com.bustrackr.repository.DriverRepository;
import com.bustrackr.repository.TransportMemberRepository;
import com.bustrackr.repository.TripRepository;
import com.bustrackr.repository.TripScheduleRepository;
import com.bustrackr.security.CustomUserDetails;
import com.bustrackr.security.SecurityService;
import com.bustrackr.service.DriverService;
import com.bustrackr.specification.DriverSpecification;
import com.bustrackr.specification.TripScheduleSpecification;
import com.bustrackr.specification.TripSpecification;
import lombok.RequiredArgsConstructor;
import org.apache.coyote.BadRequestException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DriverServiceImpl implements DriverService {

    private final DriverRepository driverRepository;
    private final TransportMemberRepository transportMemberRepository;
    private final DriverMapper driverMapper;
    private final TripRepository tripRepository;
    private final TripScheduleRepository tripScheduleRepository;

    private final SecurityService securityService;


    @Override
    public DriverResponse create(CreateDriverRequest request) {
        Driver driver;

        Specification<Driver> spec=Specification.allOf();
        spec=spec.and(DriverSpecification.hasMemberId(request.memberId()));

        //If driver not deleted and is a member
        if(driverRepository.exists(spec.and(DriverSpecification.isActive(true)))){
            throw new ResourceAlreadyExistException("Driver already exists with member id="+request.memberId());
        } else if (driverRepository.exists(spec.and(DriverSpecification.isActive(false)))) { //If driver deleted and was a member
            driver=driverRepository.findOne(spec.and(DriverSpecification.isActive(false))).get();
            driver.setActive(true);

            //default status set
            driver.setStatus(DriverStatus.AVAILABLE);

            driver.setCreatedAt(LocalDateTime.now());
            driver.setUpdatedAt(LocalDateTime.now());
            driver.setLicenseExpiryDate(request.licenseExpiryDate());
            driver.setLicenseNumber(request.licenseNumber());

        } else {//new creation of driver
            TransportMember transportMember = transportMemberRepository.findById(request.memberId())
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id=" + request.memberId()));
            driver=driverMapper.toEntity(request);
            driver.setTransportMember(transportMember);

            //default status set
            driver.setStatus(DriverStatus.AVAILABLE);
            driver.setActive(true);
        }

        return driverMapper.toResponse(driverRepository.save(driver));
    }

    @Override
    public DriverResponse getDriverById(Long id) {
        Specification<Driver> spec=Specification.allOf();
        spec=spec.and(DriverSpecification.hasMemberId(securityService.getLoggedInUser().getTransportMemberId()));
        spec=spec.and(DriverSpecification.hasId(id));

        //not needed but only for check
        spec=spec.and(DriverSpecification.isActive(true));

        Driver driver=driverRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id="+id));

        return driverMapper.toResponse(driver);
    }

    @Override
    public Page<DriverResponse> getAllDrivers(int page, int size, DriverFilter filter) {
        Pageable pageable= PageRequest.of(page, size, Sort.by("name").ascending());
        Specification<Driver> spec=Specification.allOf();

        List<Long> memberIds=transportMemberRepository.getIdByTransportSystemIdAndRoleAndActive(securityService.getCurrentTransportSystemId(),TransportMemberRole.ROLE_DRIVER,true);

        spec=spec.and(DriverSpecification.hasMemberIds(memberIds));
        spec=spec.and(DriverSpecification.isActive(true));

        if(filter!=null){
            if(filter.name()!=null) spec=spec.and(DriverSpecification.hasNameLike(filter.name()));
            if(filter.address()!=null)spec=spec.and(DriverSpecification.hasAddressLike(filter.address()));
            if(filter.licenseNumber()!=null)spec=spec.and(DriverSpecification.hasLicenseNumber(filter.licenseNumber()));
            if(filter.status()!=null)spec=spec.and(DriverSpecification.hasStatus(filter.status()));
        }
        Page<Driver> drivers=driverRepository.findAll(spec,pageable);

        return drivers.map(driverMapper::toResponse);
    }

    @Override
    public DriverResponse update(Long id, UpdateDriverRequest request) {
        Specification<Driver> spec=Specification.allOf();
        spec=spec.and(DriverSpecification.hasMemberId(securityService.getLoggedInUser().getTransportMemberId()));
        spec=spec.and(DriverSpecification.hasId(id));

        //not needed but only for check
        spec=spec.and(DriverSpecification.isActive(true));

        Driver driver=driverRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id="+id));

        driverMapper.updateEntity(request,driver);

        return driverMapper.toResponse(driverRepository.save(driver));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Specification<Trip> triSpec=Specification.allOf();
        triSpec=triSpec.and(TripSpecification.hasDriverId(id));
        triSpec=triSpec.and(TripSpecification.hasStatus(TripStatus.SCHEDULED).or(TripSpecification.hasStatus(TripStatus.ACTIVE)));

        Specification<TripSchedule> tripScheduleSpecification=Specification.allOf();
        tripScheduleSpecification=tripScheduleSpecification.and(TripScheduleSpecification.hasDriverId(id));
        tripScheduleSpecification=tripScheduleSpecification.and(TripScheduleSpecification.hasStatus(TripScheduleStatus.ACTIVE));

        if(tripRepository.exists(triSpec) || tripScheduleRepository.exists(tripScheduleSpecification)){
            throw new InvalidRequestException("Driver has an active trip and cannot be deactivated");
        }

        Driver driver=driverRepository.findByIdAndTransportMemberId(id, securityService.getLoggedInUser().getTransportMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id="+id));

        if(!driver.getActive()){
            throw new IllegalStateException("Driver is already inactive or deleted");
        }
        //deleting driver by soft delete(deactivation)
        driver.setActive(false);
    }


    @Override
    public Driver getLoggedInDriver() {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long memberId=customUserDetails.getTransportMemberId();
        TransportMember transportMember=transportMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with member id="+memberId));

        if(!transportMember.getStatus().name().equals(TransportMemberStatus.ACTIVE.name())){
            throw new ResourceNotAvailableException("Driver account is not active="+transportMember.getStatus());
        }

       if(transportMember.getRole()!= TransportMemberRole.ROLE_DRIVER){
           throw new MemberRoleMismatchException("member is not a Driver");
       }

        return transportMember.getDriver();
    }
    public DriverResponse getLoggedInDriverResponse(){
        return driverMapper.toResponse(getLoggedInDriver());
    }

    @Override
    public DriverResponse updateStatus(Long id, UpdateDriverStatus status) {
        Specification<Driver> spec=Specification.allOf();

        spec=spec.and(DriverSpecification.hasId(id));
        spec=spec.and(DriverSpecification.isActive(true));

        Driver driver=driverRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with  id="+id));

        if(driver.getStatus()==DriverStatus.ON_TRIP){
            throw new InvalidRequestException("Can not change the driver status from ON_TRIP");
        }
        driver.setStatus(DriverStatus.valueOf(status.name()));

        return driverMapper.toResponse(driverRepository.save(driver));
    }
}
