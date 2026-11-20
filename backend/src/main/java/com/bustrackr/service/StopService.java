package com.bustrackr.service;

import com.bustrackr.dto.stop.CreateStopRequest;
import com.bustrackr.dto.stop.StopFilter;
import com.bustrackr.dto.stop.StopResponse;
import com.bustrackr.dto.stop.UpdateStopRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

@Service
public interface StopService {
    StopResponse create(@Valid CreateStopRequest request);

    StopResponse getStopsById(Long id);

    StopResponse updateStops(Long id, UpdateStopRequest request);

    void deleteStops(Long id);

    Page<StopResponse> getPrivateStops(int page, int size, StopFilter filter);

    Page<StopResponse> getPublicStops(int page, int size, Long transportSystemId);
}
