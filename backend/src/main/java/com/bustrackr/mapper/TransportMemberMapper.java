package com.bustrackr.mapper;

import com.bustrackr.dto.transportmember.TransportMemberResponse;
import com.bustrackr.dto.transportmember.UpdateTransportMemberRequest;
import com.bustrackr.entity.TransportMember;
import com.bustrackr.entity.User;
import org.springframework.stereotype.Component;

@Component
public class TransportMemberMapper {


    public void updateEntity(
            UpdateTransportMemberRequest request,
            TransportMember entity
    ) {
        if (request.role() != null) {
            entity.setRole(request.role());
        }
    }

    public TransportMemberResponse toResponse(TransportMember entity) {
        User user=entity.getUser();

        return new TransportMemberResponse(
                entity.getId(),
                user.getId(),
                entity.getTransportSystem().getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                entity.getRole(),
                entity.getStatus()
        );
    }
}