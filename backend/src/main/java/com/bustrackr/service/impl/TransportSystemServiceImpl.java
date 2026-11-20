package com.bustrackr.service.impl;

import com.bustrackr.dto.auth.LoginResponse;
import com.bustrackr.dto.transportmember.CreateTransportMemberRequest;
import com.bustrackr.dto.transportmember.MembershipCheckResponse;
import com.bustrackr.dto.transportmember.TransportMemberResponse;
import com.bustrackr.dto.transportsystem.CreateTransportSystemRequest;
import com.bustrackr.dto.transportsystem.TransportSystemResponse;
import com.bustrackr.dto.transportsystem.UpdateTransportSystemRequest;
import com.bustrackr.entity.TransportMember;
import com.bustrackr.entity.TransportSystem;
import com.bustrackr.enums.*;
import com.bustrackr.exception.ResourceAlreadyExistException;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.mapper.TransportSystemMapper;
import com.bustrackr.projection.ActiveTripsCountResponse;
import com.bustrackr.projection.RouteCountResponse;
import com.bustrackr.repository.RouteRepository;
import com.bustrackr.repository.TransportMemberRepository;
import com.bustrackr.repository.TransportSystemRepository;
import com.bustrackr.repository.TripRepository;
import com.bustrackr.security.AuthUtil;
import com.bustrackr.security.CustomUserDetails;
import com.bustrackr.security.SecurityService;
import com.bustrackr.service.TransportMemberService;
import com.bustrackr.service.TransportSystemService;
import com.bustrackr.specification.TransportSystemSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TransportSystemServiceImpl implements TransportSystemService {

    private final TransportSystemRepository transportSystemRepository;
    private final TransportMemberRepository transportMemberRepository;
    private final TransportMemberService transportMemberService;
    private final RouteRepository routeRepository;
    private final TripRepository tripRepository;
    private final TransportSystemMapper mapper;

    private final AuthUtil authUtil;
    private final SecurityService securityService;

    @Override
    public TransportSystemResponse create(CreateTransportSystemRequest request) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();

        TransportSystem transportSystem = mapper.toEntity(request);
        transportSystem.setActive(true);

        //setting active by default
        transportSystem.setStatus(TransportSystemStatus.ACTIVE);

        TransportSystem savedTransportSystem=transportSystemRepository.save(transportSystem);
        if(savedTransportSystem.getAccessType().name().equals(AccessType.PRIVATE.name())) {
            CreateTransportMemberRequest memberRequest=CreateTransportMemberRequest.builder()
                    .userId(customUserDetails.getUserId())
                    .transportSystemId(savedTransportSystem.getId())
                    .role(TransportMemberRole.ROLE_ADMIN)
                    .status(TransportMemberStatus.ACTIVE)
                    .build();
            transportMemberService.create(memberRequest);
        }

        return mapper.toResponse(savedTransportSystem);
    }

    @Override
    public TransportSystemResponse getPublicTransportById(Long id) {
        Specification<TransportSystem> spec1=Specification.allOf();
        spec1=spec1.and(TransportSystemSpecification.hasId(id));
        spec1=spec1.and(TransportSystemSpecification.hasAccessType(AccessType.PUBLIC));
        spec1=spec1.and(TransportSystemSpecification.hasActive(true));

        TransportSystem transportSystem=transportSystemRepository.findOne(spec1)
                                            .orElseThrow(() -> new ResourceNotFoundException("TransportSystem not found with id="+id));
        return mapper.toResponse(transportSystem);
    }

    @Override
    public Page<TransportSystemResponse> getAllPublicTransport(int page, int size,String name,String city) {
        Pageable pageable= PageRequest.of(page,size);


        Specification<TransportSystem> spec=Specification.allOf();
        spec=spec.and(TransportSystemSpecification.hasActive(true));
        if(name!=null){
           spec=spec.and(TransportSystemSpecification.hasNameLike(name));
        }
        else if(city != null){
           spec=spec.and(TransportSystemSpecification.hasAddress(city));
        }

        Page<TransportSystem> transportSystems=transportSystemRepository.findAll(spec,pageable);

        return transportSystems.map(mapper::toResponse);
    }

    @Override
    public TransportSystemResponse getPrivateTransportById() {
        Long id=securityService.getCurrentTransportSystemId();
        Specification<TransportSystem> spec1=Specification.allOf();
        spec1=spec1.and(TransportSystemSpecification.hasId(id));
        spec1=spec1.and(TransportSystemSpecification.hasAccessType(AccessType.PRIVATE));
        spec1=spec1.and(TransportSystemSpecification.hasActive(true));

        TransportSystem transportSystem=transportSystemRepository.findOne(spec1)
                .orElseThrow(() -> new ResourceNotFoundException("TransportSystem not found with id="+id));

        return mapper.toResponse(transportSystem);

    }

    @Override
    public Page<TransportSystemResponse> getAllPrivateTransport(int page, int size) {
        Pageable pageable= PageRequest.of(page,size);

        Specification<TransportSystem> spec1=Specification.allOf();
        spec1=spec1.and(TransportSystemSpecification.hasAccessType(AccessType.PRIVATE));
        spec1=spec1.and(TransportSystemSpecification.hasActive(true));

        Page<TransportSystem> transportSystems=transportSystemRepository.findAll(spec1,pageable);

        return transportSystems.map(mapper::toResponse);

    }

    @Override
    public List<RouteCountResponse> getRouteCount() {
        return routeRepository.findRouteCounts();
    }

    @Override
    public List<ActiveTripsCountResponse> getActiveTrips() {
        return tripRepository.findTripCountsByStatus(TripStatus.ACTIVE);
    }

    @Override
    public Page<TransportSystemResponse> getTransportSystemsByUserId(Pageable pageable) {
        Long userId=securityService.getLoggedInUser().getUserId();
        List<Long> transportSystemIds= transportMemberRepository.findDistinctTransportSystemIdByUserId(userId);

        Specification<TransportSystem> spec=Specification.allOf();
        spec=spec.and(TransportSystemSpecification.hasIds(transportSystemIds));
        spec=spec.and(TransportSystemSpecification.hasActive(true));

        Page<TransportSystem> transportSystems=transportSystemRepository.findAll(spec,pageable);
        if(transportSystems.isEmpty()){
            return Page.empty();
        }
        return transportSystems.map(mapper::toResponse);
    }

    @Override
    public MembershipCheckResponse checkMembership(Long transportSystemId) {
        Specification<TransportSystem> spec1=Specification.allOf();
        spec1=spec1.and(TransportSystemSpecification.hasId(transportSystemId));
        spec1=spec1.and(TransportSystemSpecification.hasActive(true));

        TransportSystem transportSystem=transportSystemRepository.findOne(spec1)
                .orElseThrow(() -> new ResourceNotFoundException("TransportSystem not found with id="+transportSystemId));

        if(securityService.hasNoAuthentication()){
            return new MembershipCheckResponse(transportSystemId,transportSystem.getAccessType(),false,null,null,false);
        }
        Long userId=securityService.getLoggedInUser().getUserId();

        if(!transportMemberRepository.existsByUserIdAndTransportSystemId(userId,transportSystemId)){
            return new MembershipCheckResponse(transportSystemId,transportSystem.getAccessType(),false,null,null,true);
        }
        TransportMember transportMember=transportMemberRepository.findByUserIdAndTransportSystemId(userId,transportSystemId);

        return new MembershipCheckResponse(transportSystemId,transportSystem.getAccessType(),true,transportMember.getStatus(),transportMember.getRole(),true);
    }

    @Override
    public TransportSystemResponse update(Long id, UpdateTransportSystemRequest request) {

        TransportSystem transportSystem=transportSystemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TransportSystem not found with id="+id));
        mapper.updateEntity(request,transportSystem);

        return mapper.toResponse(transportSystemRepository.save(transportSystem));
    }

    @Override
    public void delete(Long id) {
        TransportSystem transportSystem=transportSystemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TransportSystem not found with id="+id));

        transportSystemRepository.delete(transportSystem);
    }

    @Override
    public LoginResponse checkAccess(Long transportSystemId) {

        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long userId=customUserDetails.getUserId();

        TransportMember member=transportMemberService.getMember(userId,transportSystemId);

        if(member == null){
            return new LoginResponse(null,"You are not a member please request for a membership");
        }
        if(member.getStatus() == TransportMemberStatus.ACTIVE){
            String token = authUtil.generateMemberToken(userId,transportSystemId,member.getId(),member.getRole().name());
            return new LoginResponse(token,"Access granted");
        }
        if(member.getStatus() == TransportMemberStatus.PENDING){
            return new LoginResponse(null,"Wait! your request is still pending");
        }

        //if status is Rejected
        return new LoginResponse(null,"You are rejected earlier ...Please make a request again to get the membership");
    }

    @Override
    public TransportMemberResponse requestMembership(Long transportSystemId) {
        return transportMemberService.requestPassengerMembership(transportSystemId);
    }


}
