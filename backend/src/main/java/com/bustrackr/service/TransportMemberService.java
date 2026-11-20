package com.bustrackr.service;

import com.bustrackr.dto.transportmember.*;
import com.bustrackr.entity.TransportMember;
import com.bustrackr.enums.TransportMemberStatus;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public interface TransportMemberService {
     TransportMember create(@Valid CreateTransportMemberRequest request);

    TransportMemberResponse getById(Long id);

    Page<TransportMemberResponse> getAllTransportMembers(int page, int size, TransportMemberFilter filter);

    TransportMemberResponse update(Long id, UpdateTransportMemberRequest request);

    void delete(Long id);


    TransportMember getMember(Long userId, Long transportSystemId);

    TransportMemberResponse requestPassengerMembership(Long transportSystemId);


    TransportMemberResponse createDriverMember(AdminBasedDriverMembershipRequest driverMembershipRequest);

    Page<TransportMemberResponse> getMembershipRequests(TransportMemberStatus status, Pageable pageable);

    TransportMemberResponse approveMembership( Long memberId, @Valid ApproveMemberRequest request);

    TransportMemberResponse rejectMembership( Long memberId);

    TransportMemberResponse createMember(AdminBasedMembershipRequest adminMemberRequest);

    TransportMemberResponse getAdmin();
}
