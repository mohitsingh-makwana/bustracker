package com.bustrackr.service.impl;


import com.bustrackr.dto.driver.CreateDriverRequest;
import com.bustrackr.dto.transportmember.*;
import com.bustrackr.dto.user.CreateUserRequest;
import com.bustrackr.dto.user.UserResponse;
import com.bustrackr.entity.TransportMember;
import com.bustrackr.entity.TransportSystem;
import com.bustrackr.entity.User;
import com.bustrackr.enums.TransportMemberRole;
import com.bustrackr.enums.TransportMemberStatus;
import com.bustrackr.exception.InvalidRequestException;
import com.bustrackr.exception.ResourceAlreadyExistException;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.mapper.TransportMemberMapper;
import com.bustrackr.repository.TransportMemberRepository;
import com.bustrackr.repository.TransportSystemRepository;
import com.bustrackr.repository.UserRepository;
import com.bustrackr.security.CustomUserDetails;
import com.bustrackr.security.SecurityService;
import com.bustrackr.service.DriverService;
import com.bustrackr.service.TransportMemberService;
import com.bustrackr.service.UserService;
import com.bustrackr.specification.TransportMemberSpecification;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TransportMemberServiceImpl implements TransportMemberService {

    private final TransportMemberRepository transportMemberRepository;
    private final UserRepository userRepository;
    private final TransportSystemRepository transportSystemRepository;
    private  final TransportMemberMapper transportMemberMapper;

    private final SecurityService securityService;
    private final DriverService driverService;
    private final UserService userService;
    private final EmailService emailService;


    @SneakyThrows
    @Override
    public TransportMember create(CreateTransportMemberRequest request) {
        User user=userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id ="+request.userId()));

        Specification<TransportMember> spec=Specification.allOf();
        spec=spec.and(TransportMemberSpecification.hasTransportSystemId(request.transportSystemId()));
        spec=spec.and(TransportMemberSpecification.hasUserId(request.userId()));
        spec=spec.and(TransportMemberSpecification.hasRole(request.role()));

        TransportMember transportMember;

        TransportSystem transportSystem=transportSystemRepository.findById(request.transportSystemId())
                .orElseThrow(() -> new ResourceNotFoundException("TransportSystem not found with id ="+request.transportSystemId()));

        Optional<TransportMember> checkMembership=transportMemberRepository.findOne(spec.and(TransportMemberSpecification.isActive(true)));
        if(checkMembership.isPresent()){
            throw new InvalidRequestException("Already a member with memberid="+checkMembership.get().getId());
        }
        else if(transportMemberRepository.exists(spec.and(TransportMemberSpecification.isActive(false)))){
            throw new ResourceAlreadyExistException("Member account exists but it is inactive");
        }
        else {
            transportMember = TransportMember.builder()
                    .transportSystem(transportSystem)
                    .role(request.role())
                    .status(request.status())
                    .user(user)
                    .active(true)
                    .build();
        }

        return transportMemberRepository.save(transportMember);
    }


    @Override
    public TransportMemberResponse getById(Long id) {

        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();

        Specification<TransportMember> spec=Specification.allOf();
        spec=spec.and(TransportMemberSpecification.hasId(id));
        spec=spec.and(TransportMemberSpecification.hasTransportSystemId(transportSystemId));
        spec=spec.and(TransportMemberSpecification.isActive(true));

        TransportMember transportMember=transportMemberRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("TransportMember not found with id ="+id));

        return transportMemberMapper.toResponse(transportMember);
    }

    @Override
    public Page<TransportMemberResponse> getAllTransportMembers(int page, int size, TransportMemberFilter filter) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();

        Specification<TransportMember> spec=Specification.allOf();
        spec=spec.and(TransportMemberSpecification.hasTransportSystemId(transportSystemId));
        spec=spec.and(TransportMemberSpecification.isActive(true));

        Pageable pageable= PageRequest.of(page, size);


        if(filter!=null ){

            if(filter.role()!=null) spec=spec.and(TransportMemberSpecification.hasRole(filter.role()));
            if(filter.status()!=null) spec=spec.and(TransportMemberSpecification.hasStatus(filter.status()));
        }
        Page<TransportMember> transportMembers=transportMemberRepository.findAll(spec,pageable);
        return transportMembers.map(transportMemberMapper::toResponse);
    }

    @Override
    public TransportMemberResponse update(Long id, UpdateTransportMemberRequest request) {


        Specification<TransportMember> spec=Specification.allOf();
        spec=spec.and(TransportMemberSpecification.hasId(id));
        spec=spec.and(TransportMemberSpecification.hasTransportSystemId(securityService.getCurrentTransportSystemId()));


        TransportMember transportMember=transportMemberRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("TransportMember not found with id ="+id));

        transportMemberMapper.updateEntity(request,transportMember);
        return transportMemberMapper.toResponse(transportMemberRepository.save(transportMember));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();

        Specification<TransportMember> spec=Specification.allOf();
        spec=spec.and(TransportMemberSpecification.hasId(id));
        spec=spec.and(TransportMemberSpecification.hasTransportSystemId(transportSystemId));


        TransportMember transportMember=transportMemberRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("TransportMember not found with id ="+id));

        if(transportMember.getRole()==TransportMemberRole.ROLE_DRIVER) {
            driverService.delete(transportMember.getDriver().getId());
        }
        //Soft delete
        transportMember.setActive(false);
    }


    @Override
    public TransportMember getMember(Long userId, Long transportSystemId) {
        Specification<TransportMember> spec=Specification.allOf();
        spec=spec.and(TransportMemberSpecification.hasUserId(userId));
        spec=spec.and(TransportMemberSpecification.hasTransportSystemId(transportSystemId));


        return transportMemberRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("TransportMember not found with userId ="+userId));
    }


    @Transactional
    @Override
    public TransportMemberResponse requestPassengerMembership(Long transportSystemId) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();

        Long userId=customUserDetails.getUserId();
        CreateTransportMemberRequest request=CreateTransportMemberRequest.builder()
                .userId(userId)
                .status(TransportMemberStatus.PENDING)
                .role(TransportMemberRole.ROLE_PASSENGER)
                .transportSystemId(transportSystemId)
                .build();
        return transportMemberMapper.toResponse(create(request));
    }
    @Transactional
    @Override
    public TransportMemberResponse createDriverMember(AdminBasedDriverMembershipRequest driverMembershipRequest) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();
        String transportSystemName=customUserDetails.getTransportSystemName();


        UserResponse userResponse;

        Optional<User> user=userRepository.findUserByEmail(driverMembershipRequest.email());
        String password=null;

        //Creating User account
        if(user.isEmpty()) {
            password="Driver@123";
            CreateUserRequest userRequest = new CreateUserRequest(driverMembershipRequest.name(),driverMembershipRequest.email(),password, driverMembershipRequest.phone(),null);
            userResponse=userService.create(userRequest);
        }
        else{
            User u=user.get();
            userResponse=UserResponse.builder()
                    .email(u.getEmail())
                    .fullName(u.getFullName())
                    .id(u.getId())
                    .build();
        }


        //Creating Member account
        CreateTransportMemberRequest memberRequest=CreateTransportMemberRequest.builder()
                .userId(userResponse.id())
                .status(TransportMemberStatus.ACTIVE)
                .role(TransportMemberRole.ROLE_DRIVER)
                .transportSystemId(transportSystemId)
                .build();

        //Member created
        TransportMember transportMember=create(memberRequest);

        CreateDriverRequest driverRequest=CreateDriverRequest.builder()
                .memberId(transportMember.getId())// Member is active and not deleted check done
                .name(driverMembershipRequest.name())
                .address(driverMembershipRequest.address())
                .licenseNumber(driverMembershipRequest.licenseNo())
                .licenseExpiryDate(driverMembershipRequest.licenseExpiryDate())
                .build();

        //Creating driver account
        driverService.create(driverRequest);

        //Sending Notification via Email
        if(password != null) {
            emailService.sendAccountCreatedEmail(userResponse.email(), userResponse.fullName(), "DRIVER",password,transportSystemName);
        }
        else{
            emailService.sendMemberAccountCreatedEmail(userResponse.email(), userResponse.fullName(), "DRIVER",transportSystemName);
        }

        return transportMemberMapper.toResponse(transportMember);
    }

    @Transactional
    @Override
    public TransportMemberResponse createMember(AdminBasedMembershipRequest membershipRequest) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();
        String transportSystemName=customUserDetails.getTransportSystemName();

        String passwordHash=null;
        String role=membershipRequest.role()==TransportMemberRole.ROLE_ADMIN ? "ADMIN" : "PASSENGER";


        //Creating User account
        UserResponse userResponse;

        Optional<User> user=userRepository.findUserByEmail(membershipRequest.email());

        //Creating User account
        if(user.isEmpty()) {

            passwordHash= membershipRequest.role()==TransportMemberRole.ROLE_ADMIN ? "ADMIN@123" : "MEMBER@123";

            CreateUserRequest userRequest = new CreateUserRequest( membershipRequest.fullName(),membershipRequest.email(), passwordHash, membershipRequest.phone(),null);
            userResponse=userService.create(userRequest);
        }
        else{
            User u=user.get();
            userResponse=UserResponse.builder()
                    .email(u.getEmail())
                    .fullName(u.getFullName())
                    .id(u.getId())
                    .build();
        }
        //Creating Member account
        CreateTransportMemberRequest memberRequest=CreateTransportMemberRequest.builder()
                .userId(userResponse.id())
                .status(TransportMemberStatus.ACTIVE)
                .role(membershipRequest.role())
                .transportSystemId(transportSystemId)
                .build();

        TransportMember savedTransportMember=create(memberRequest);

        //Sending Notification via Email
        if(passwordHash != null) {
            emailService.sendAccountCreatedEmail(userResponse.email(), userResponse.fullName(),role ,passwordHash,transportSystemName);
        }
        else{
            emailService.sendMemberAccountCreatedEmail(userResponse.email(), userResponse.fullName(), "DRIVER",transportSystemName);
        }

            return transportMemberMapper.toResponse(savedTransportMember);
    }

    @Override
    public TransportMemberResponse getAdmin() {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Specification<TransportMember> spec=Specification.allOf();
        spec=spec.and(TransportMemberSpecification.hasId(customUserDetails.getTransportMemberId()));
        spec=spec.and(TransportMemberSpecification.hasTransportSystemId(customUserDetails.getTransportMemberId()));


        TransportMember transportMember=transportMemberRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("TransportMember not found with id ="+customUserDetails.getTransportMemberId()));

          return transportMemberMapper.toResponse(transportMember);
    }

    @Override
    public Page<TransportMemberResponse> getMembershipRequests(TransportMemberStatus status, Pageable pageable) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();

        Page<TransportMember> transportMembers;
        if(status!=null) {
             transportMembers = transportMemberRepository.findByTransportSystemIdAndStatus(transportSystemId, status, pageable);
        }
        else{
            transportMembers=transportMemberRepository.findByTransportSystemId(transportSystemId,pageable);
        }
        return transportMembers.map(transportMemberMapper::toResponse);
    }



    @Override
    public TransportMemberResponse approveMembership(Long memberId, ApproveMemberRequest request) {
        CustomUserDetails customUserDetails=securityService.getLoggedInUser();
        Long transportSystemId=customUserDetails.getTransportSystemId();
        String transportSystemName=customUserDetails.getTransportSystemName();

        Specification<TransportMember> spec=Specification.allOf();
        spec=spec.and(TransportMemberSpecification.hasId(memberId));
        spec=spec.and(TransportMemberSpecification.hasTransportSystemId(transportSystemId));

        TransportMember transportMember=transportMemberRepository.findOne(spec)
                .orElseThrow(() -> new ResourceNotFoundException("TransportMember not found with id ="+memberId));

        transportMember.setStatus(request.status());
       transportMember.setRole(request.role());

       TransportMember savedTransportMember=transportMemberRepository.save(transportMember);
       User savedUser=savedTransportMember.getUser();

       //Email Notification Added
       emailService.sendRequestAcceptedEmail(savedUser.getEmail(), savedUser.getFullName(),transportSystemName);
        return transportMemberMapper.toResponse(savedTransportMember);
    }

    @Override
    public TransportMemberResponse rejectMembership( Long memberId) {
        String transportSystemName=securityService.getCurrentTransportSystemName();

        TransportMember transportMember = transportMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("TransportMember not found with id =" + memberId));
        transportMember.setStatus(TransportMemberStatus.REJECTED);

        TransportMember savedTransportMember=transportMemberRepository.save(transportMember);
        User savedUser=savedTransportMember.getUser();

        //Email Notification Added
        emailService.sendRequestRejectedEmail(savedUser.getEmail(), savedUser.getFullName(),transportSystemName);

        return transportMemberMapper.toResponse(savedTransportMember);
    }

}
