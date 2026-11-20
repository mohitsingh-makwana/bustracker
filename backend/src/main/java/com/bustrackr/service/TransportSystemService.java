package com.bustrackr.service;

import com.bustrackr.dto.auth.LoginResponse;
import com.bustrackr.dto.transportmember.MembershipCheckResponse;
import com.bustrackr.dto.transportmember.TransportMemberResponse;
import com.bustrackr.dto.transportsystem.CreateTransportSystemRequest;
import com.bustrackr.dto.transportsystem.TransportSystemResponse;
import com.bustrackr.dto.transportsystem.UpdateTransportSystemRequest;
import com.bustrackr.projection.ActiveTripsCountResponse;
import com.bustrackr.projection.RouteCountResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface TransportSystemService {

    TransportSystemResponse create(CreateTransportSystemRequest request);

    TransportSystemResponse getPublicTransportById(Long id);

    Page<TransportSystemResponse> getAllPublicTransport(int page, int size,String name,String address);

    TransportSystemResponse update(Long id, UpdateTransportSystemRequest request);

    void delete(Long id);

    LoginResponse checkAccess(Long transportSystemId);

    TransportMemberResponse requestMembership(Long transportSystemId);

    TransportSystemResponse getPrivateTransportById();

    Page<TransportSystemResponse> getAllPrivateTransport(int page, int size);

    List<RouteCountResponse> getRouteCount();

    List<ActiveTripsCountResponse> getActiveTrips();

    Page<TransportSystemResponse> getTransportSystemsByUserId(Pageable pageable);

    MembershipCheckResponse checkMembership(Long transportSystemId);
}
